/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = process.cwd();
const dataDir = path.join(projectRoot, "data");
const outputsDir = path.join(projectRoot, "public", "outputs");
const storeFile = path.join(dataDir, "frameflow-store.json");
const backupStoreFile = path.join(dataDir, "frameflow-store.backup.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function listFilesRecursive(baseDir) {
  const files = [];
  const stack = [""];

  while (stack.length) {
    const relativeDir = stack.pop();
    const absoluteDir = path.join(baseDir, relativeDir);
    for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
      const relativePath = relativeDir ? path.posix.join(relativeDir, entry.name) : entry.name;
      if (entry.isDirectory()) {
        stack.push(relativePath);
      } else {
        files.push(relativePath);
      }
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

function toRecoveredInputName(outputRelativePath) {
  const ext = path.extname(outputRelativePath);
  const base = outputRelativePath.slice(0, outputRelativePath.length - ext.length);

  if (base.endsWith("-translated")) {
    return `${base.slice(0, -"-translated".length)}${ext}`;
  }

  const translatedOpenAiMatch = base.match(/^(.*)__translated-[^_]+__\d+$/);
  if (translatedOpenAiMatch) {
    return `${translatedOpenAiMatch[1]}${ext}`;
  }

  return `${base}${ext}`;
}

function buildRecoveredJob(jobId, files, mtimeIso) {
  const jobItems = files.map((relativePath, index) => ({
    assetId: `recovered-input-${jobId}-${index + 1}`,
    assetName: path.basename(toRecoveredInputName(relativePath)),
    relativePath: toRecoveredInputName(relativePath),
    status: "succeeded",
    outputAssetId: `recovered-output-${jobId}-${index + 1}`,
    finishedAt: mtimeIso,
  }));

  return {
    id: jobId,
    name: `Recovered ${jobId}`,
    workflowName: "Recovered Outputs",
    itemCount: files.length,
    progress: 100,
    status: "recovered",
    statusTone: "green",
    routingPolicy: "recovered",
    assetIds: jobItems.map((item) => item.assetId),
    outputCount: files.length,
    provider: "openai",
    taskType: "redraw-translate-zh-en",
    providerModelFamily: "openai",
    model: "recovered",
    prompt: "Recovered from existing output files after store reset.",
    successCount: files.length,
    failedCount: 0,
    pendingCount: 0,
    runningCount: 0,
    startedAt: mtimeIso,
    finishedAt: mtimeIso,
    jobItems,
  };
}

function buildRecoveredAssets(jobId, files, rootLevel = false) {
  return files.map((relativePath, index) => {
    const previewUrl = rootLevel
      ? `/outputs/${relativePath}`
      : `/outputs/${jobId}/${relativePath}`;

    return {
      id: `recovered-output-${jobId}-${index + 1}`,
      name: path.basename(relativePath),
      kind: path.extname(relativePath).replace(".", "").toUpperCase() || "PNG",
      dimensions: "Recovered output",
      status: "ready",
      statusTone: "green",
      tags: ["recovered-output"],
      previewUrl,
      source: `job:${jobId}`,
      uploadedAt: fs.statSync(
        rootLevel ? path.join(outputsDir, relativePath) : path.join(outputsDir, jobId, relativePath),
      ).mtime.toISOString(),
      relativePath,
      sourceAssetId: `recovered-input-${jobId}-${index + 1}`,
    };
  });
}

function main() {
  ensureDir(dataDir);

  const existingStore = fs.existsSync(storeFile)
    ? readJson(storeFile)
    : { jobs: [], workflows: [], assets: [] };

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeJson(path.join(dataDir, `frameflow-store.pre-recovery.${timestamp}.json`), existingStore);
  if (fs.existsSync(backupStoreFile)) {
    writeJson(
      path.join(dataDir, `frameflow-store.backup.pre-recovery.${timestamp}.json`),
      readJson(backupStoreFile),
    );
  }

  const recoveredJobs = [];
  const recoveredAssets = [];
  const report = {
    generatedAt: new Date().toISOString(),
    recoveredJobCount: 0,
    recoveredOutputCount: 0,
    jobs: [],
    legacyRootOutputs: [],
  };

  if (fs.existsSync(outputsDir)) {
    for (const entry of fs.readdirSync(outputsDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith("job_")) {
        continue;
      }

      const jobId = entry.name;
      const jobDir = path.join(outputsDir, jobId);
      const files = listFilesRecursive(jobDir);
      if (!files.length) {
        continue;
      }

      const mtimeIso = fs.statSync(jobDir).mtime.toISOString();
      recoveredJobs.push(buildRecoveredJob(jobId, files, mtimeIso));
      recoveredAssets.push(...buildRecoveredAssets(jobId, files));
      report.jobs.push({
        jobId,
        outputCount: files.length,
        firstOutputAt: mtimeIso,
        sampleFiles: files.slice(0, 5),
      });
    }

    const legacyRootFiles = fs
      .readdirSync(outputsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    if (legacyRootFiles.length) {
      const jobId = "job_recovered_legacy_root_outputs";
      const mtimeIso = fs.statSync(outputsDir).mtime.toISOString();
      recoveredJobs.push(buildRecoveredJob(jobId, legacyRootFiles, mtimeIso));
      recoveredAssets.push(...buildRecoveredAssets(jobId, legacyRootFiles, true));
      report.legacyRootOutputs = legacyRootFiles;
    }
  }

  recoveredJobs.sort((a, b) => (b.finishedAt || "").localeCompare(a.finishedAt || ""));

  const preservedAssets = (existingStore.assets || []).filter(
    (asset) => !(asset.source || "").startsWith("job:"),
  );

  const nextStore = {
    jobs: recoveredJobs,
    workflows: existingStore.workflows || [],
    assets: [...preservedAssets, ...recoveredAssets],
  };

  report.recoveredJobCount = recoveredJobs.length;
  report.recoveredOutputCount = recoveredAssets.length;

  writeJson(storeFile, nextStore);
  writeJson(backupStoreFile, nextStore);
  writeJson(path.join(dataDir, "recovery-report.json"), report);

  console.log(
    JSON.stringify(
      {
        recoveredJobs: report.recoveredJobCount,
        recoveredOutputs: report.recoveredOutputCount,
        reportFile: "data/recovery-report.json",
      },
      null,
      2,
    ),
  );
}

main();

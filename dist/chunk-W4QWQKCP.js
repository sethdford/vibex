import {
  createUserError
} from "./chunk-65SYJAJO.js";
import {
  logger
} from "./chunk-3Y4ABCUV.js";

// src/fs/operations.ts
import fs from "fs/promises";
import path from "path";
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { constants } from "fs";

// src/utils/validation.ts
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function isValidPath(value) {
  return /^[a-zA-Z0-9\/\\\._\-~]+$/.test(value) && !value.includes("..") && value.length > 0;
}
function isValidFilePath(value) {
  return isValidPath(value) && !value.endsWith("/") && !value.endsWith("\\");
}
function isValidDirectoryPath(value) {
  return isValidPath(value);
}

// src/fs/operations.ts
async function fileExists(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch (error) {
    return false;
  }
}
async function directoryExists(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}
async function ensureDirectory(dirPath) {
  try {
    if (!await directoryExists(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true });
      logger.debug(`Created directory: ${dirPath}`);
    }
  } catch (error) {
    logger.error(`Failed to create directory: ${dirPath}`, error);
    throw createUserError(`Failed to create directory: ${dirPath}`, {
      cause: error,
      category: 3 /* FILE_SYSTEM */,
      resolution: "Check file permissions and try again."
    });
  }
}
async function readTextFile(filePath, encoding = "utf-8") {
  if (!isValidFilePath(filePath)) {
    throw createUserError(`Invalid file path: ${filePath}`, {
      category: 10 /* VALIDATION */,
      resolution: "Provide a valid file path."
    });
  }
  try {
    if (!await fileExists(filePath)) {
      throw createUserError(`File not found: ${filePath}`, {
        category: 18 /* FILE_NOT_FOUND */,
        resolution: "Check the file path and try again."
      });
    }
    return await fs.readFile(filePath, { encoding });
  } catch (error) {
    if (error.code === "ENOENT") {
      throw createUserError(`File not found: ${filePath}`, {
        cause: error,
        category: 18 /* FILE_NOT_FOUND */,
        resolution: "Check the file path and try again."
      });
    }
    throw createUserError(`Failed to read file: ${filePath}`, {
      cause: error,
      category: 20 /* FILE_READ */,
      resolution: "Check file permissions and try again."
    });
  }
}
async function readFileLines(filePath, start, end, encoding = "utf-8") {
  try {
    const content = await readTextFile(filePath, encoding);
    const lines = content.split("\n");
    const startIndex = Math.max(0, start - 1);
    const endIndex = Math.min(lines.length, end);
    return lines.slice(startIndex, endIndex);
  } catch (error) {
    throw createUserError(`Failed to read lines ${start}-${end} from file: ${filePath}`, {
      cause: error,
      category: 20 /* FILE_READ */,
      resolution: "Check the file path and line range, then try again."
    });
  }
}
async function writeTextFile(filePath, content, options = {}) {
  const { encoding = "utf-8", createDir = true, overwrite = true } = options;
  if (!isValidFilePath(filePath)) {
    throw createUserError(`Invalid file path: ${filePath}`, {
      category: 10 /* VALIDATION */,
      resolution: "Provide a valid file path."
    });
  }
  try {
    if (createDir) {
      const dirPath = path.dirname(filePath);
      await ensureDirectory(dirPath);
    }
    const exists = await fileExists(filePath);
    if (exists && !overwrite) {
      throw createUserError(`File already exists: ${filePath}`, {
        category: 3 /* FILE_SYSTEM */,
        resolution: "Use overwrite option to replace existing file."
      });
    }
    await fs.writeFile(filePath, content, { encoding });
    logger.debug(`Wrote ${content.length} bytes to: ${filePath}`);
  } catch (error) {
    if (error.category) {
      throw error;
    }
    throw createUserError(`Failed to write file: ${filePath}`, {
      cause: error,
      category: 21 /* FILE_WRITE */,
      resolution: "Check file permissions and try again."
    });
  }
}
async function appendTextFile(filePath, content, options = {}) {
  const { encoding = "utf-8", createDir = true } = options;
  if (!isValidFilePath(filePath)) {
    throw createUserError(`Invalid file path: ${filePath}`, {
      category: 10 /* VALIDATION */,
      resolution: "Provide a valid file path."
    });
  }
  try {
    if (createDir) {
      const dirPath = path.dirname(filePath);
      await ensureDirectory(dirPath);
    }
    await fs.appendFile(filePath, content, { encoding });
    logger.debug(`Appended ${content.length} bytes to: ${filePath}`);
  } catch (error) {
    throw createUserError(`Failed to append to file: ${filePath}`, {
      cause: error,
      category: 21 /* FILE_WRITE */,
      resolution: "Check file permissions and try again."
    });
  }
}
async function deleteFile(filePath) {
  if (!isValidFilePath(filePath)) {
    throw createUserError(`Invalid file path: ${filePath}`, {
      category: 10 /* VALIDATION */,
      resolution: "Provide a valid file path."
    });
  }
  try {
    const exists = await fileExists(filePath);
    if (!exists) {
      logger.debug(`File does not exist, nothing to delete: ${filePath}`);
      return;
    }
    await fs.unlink(filePath);
    logger.debug(`Deleted file: ${filePath}`);
  } catch (error) {
    throw createUserError(`Failed to delete file: ${filePath}`, {
      cause: error,
      category: 3 /* FILE_SYSTEM */,
      resolution: "Check file permissions and try again."
    });
  }
}
async function rename(oldPath, newPath) {
  if (!isValidPath(oldPath) || !isValidPath(newPath)) {
    throw createUserError(`Invalid path: ${!isValidPath(oldPath) ? oldPath : newPath}`, {
      category: 10 /* VALIDATION */,
      resolution: "Provide valid file paths."
    });
  }
  try {
    const exists = await fileExists(oldPath) || await directoryExists(oldPath);
    if (!exists) {
      throw createUserError(`Path not found: ${oldPath}`, {
        category: 18 /* FILE_NOT_FOUND */,
        resolution: "Check the source path and try again."
      });
    }
    await fs.rename(oldPath, newPath);
    logger.debug(`Renamed: ${oldPath} -> ${newPath}`);
  } catch (error) {
    if (error.category) {
      throw error;
    }
    throw createUserError(`Failed to rename: ${oldPath} -> ${newPath}`, {
      cause: error,
      category: 3 /* FILE_SYSTEM */,
      resolution: "Check file permissions and ensure destination path is valid."
    });
  }
}
async function copyFile(sourcePath, destPath, options = {}) {
  const { overwrite = false, createDir = true } = options;
  if (!isValidFilePath(sourcePath) || !isValidFilePath(destPath)) {
    throw createUserError(`Invalid file path: ${!isValidFilePath(sourcePath) ? sourcePath : destPath}`, {
      category: 10 /* VALIDATION */,
      resolution: "Provide valid file paths."
    });
  }
  try {
    if (!await fileExists(sourcePath)) {
      throw createUserError(`Source file not found: ${sourcePath}`, {
        category: 18 /* FILE_NOT_FOUND */,
        resolution: "Check the source path and try again."
      });
    }
    if (createDir) {
      const dirPath = path.dirname(destPath);
      await ensureDirectory(dirPath);
    }
    const flags = overwrite ? 0 : constants.COPYFILE_EXCL;
    await fs.copyFile(sourcePath, destPath, flags);
    logger.debug(`Copied file: ${sourcePath} -> ${destPath}`);
  } catch (error) {
    if (error.code === "EEXIST" && !overwrite) {
      throw createUserError(`Destination file already exists: ${destPath}`, {
        cause: error,
        category: 3 /* FILE_SYSTEM */,
        resolution: "Use overwrite option to replace existing file."
      });
    }
    if (error.category) {
      throw error;
    }
    throw createUserError(`Failed to copy file: ${sourcePath} -> ${destPath}`, {
      cause: error,
      category: 3 /* FILE_SYSTEM */,
      resolution: "Check file permissions and paths, then try again."
    });
  }
}
async function listDirectory(dirPath) {
  if (!isValidDirectoryPath(dirPath)) {
    throw createUserError(`Invalid directory path: ${dirPath}`, {
      category: 10 /* VALIDATION */,
      resolution: "Provide a valid directory path."
    });
  }
  try {
    if (!await directoryExists(dirPath)) {
      throw createUserError(`Directory not found: ${dirPath}`, {
        category: 18 /* FILE_NOT_FOUND */,
        resolution: "Check the directory path and try again."
      });
    }
    return await fs.readdir(dirPath);
  } catch (error) {
    if (error.category) {
      throw error;
    }
    throw createUserError(`Failed to list directory: ${dirPath}`, {
      cause: error,
      category: 3 /* FILE_SYSTEM */,
      resolution: "Check directory permissions and try again."
    });
  }
}
async function getFileInfo(filePath) {
  if (!isValidPath(filePath)) {
    throw createUserError(`Invalid path: ${filePath}`, {
      category: 10 /* VALIDATION */,
      resolution: "Provide a valid file or directory path."
    });
  }
  try {
    return await fs.stat(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw createUserError(`Path not found: ${filePath}`, {
        cause: error,
        category: 18 /* FILE_NOT_FOUND */,
        resolution: "Check the path and try again."
      });
    }
    throw createUserError(`Failed to get file info: ${filePath}`, {
      cause: error,
      category: 3 /* FILE_SYSTEM */,
      resolution: "Check permissions and try again."
    });
  }
}
async function findFiles(directory, options = {}) {
  const { pattern, recursive = true, includeDirectories = false } = options;
  if (!isValidDirectoryPath(directory)) {
    throw createUserError(`Invalid directory path: ${directory}`, {
      category: 10 /* VALIDATION */,
      resolution: "Provide a valid directory path."
    });
  }
  try {
    if (!await directoryExists(directory)) {
      throw createUserError(`Directory not found: ${directory}`, {
        category: 18 /* FILE_NOT_FOUND */,
        resolution: "Check the directory path and try again."
      });
    }
    const results = [];
    async function traverseDirectory(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (includeDirectories && (!pattern || pattern.test(entry.name))) {
            results.push(fullPath);
          }
          if (recursive) {
            await traverseDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          if (!pattern || pattern.test(entry.name)) {
            results.push(fullPath);
          }
        }
      }
    }
    await traverseDirectory(directory);
    return results;
  } catch (error) {
    if (error.category) {
      throw error;
    }
    throw createUserError(`Failed to find files in directory: ${directory}`, {
      cause: error,
      category: 3 /* FILE_SYSTEM */,
      resolution: "Check directory permissions and try again."
    });
  }
}
async function streamFile(sourcePath, destPath, options = {}) {
  const { overwrite = false, createDir = true } = options;
  if (!isValidFilePath(sourcePath) || !isValidFilePath(destPath)) {
    throw createUserError(`Invalid file path: ${!isValidFilePath(sourcePath) ? sourcePath : destPath}`, {
      category: 10 /* VALIDATION */,
      resolution: "Provide valid file paths."
    });
  }
  try {
    if (!await fileExists(sourcePath)) {
      throw createUserError(`Source file not found: ${sourcePath}`, {
        category: 18 /* FILE_NOT_FOUND */,
        resolution: "Check the source path and try again."
      });
    }
    if (!overwrite && await fileExists(destPath)) {
      throw createUserError(`Destination file already exists: ${destPath}`, {
        category: 3 /* FILE_SYSTEM */,
        resolution: "Use overwrite option to replace existing file."
      });
    }
    if (createDir) {
      const dirPath = path.dirname(destPath);
      await ensureDirectory(dirPath);
    }
    const source = createReadStream(sourcePath);
    const destination = createWriteStream(destPath);
    await pipeline(source, destination);
    logger.debug(`Streamed file: ${sourcePath} -> ${destPath}`);
  } catch (error) {
    if (error.category) {
      throw error;
    }
    throw createUserError(`Failed to stream file: ${sourcePath} -> ${destPath}`, {
      cause: error,
      category: 3 /* FILE_SYSTEM */,
      resolution: "Check file permissions and paths, then try again."
    });
  }
}
async function createTempFile(options = {}) {
  const { prefix = "tmp-", suffix = "", content = "" } = options;
  try {
    const tempDir = await fs.mkdtemp(path.join(path.resolve(process.env.TEMP || process.env.TMP || "/tmp"), prefix));
    const tempFileName = `${prefix}${Date.now()}${suffix}`;
    const tempFilePath = path.join(tempDir, tempFileName);
    if (content) {
      await fs.writeFile(tempFilePath, content);
    } else {
      await fs.writeFile(tempFilePath, "");
    }
    logger.debug(`Created temporary file: ${tempFilePath}`);
    return tempFilePath;
  } catch (error) {
    throw createUserError("Failed to create temporary file", {
      cause: error,
      category: 3 /* FILE_SYSTEM */,
      resolution: "Check temporary directory permissions and try again."
    });
  }
}

export {
  isNonEmptyString,
  fileExists,
  directoryExists,
  ensureDirectory,
  readTextFile,
  readFileLines,
  writeTextFile,
  appendTextFile,
  deleteFile,
  rename,
  copyFile,
  listDirectory,
  getFileInfo,
  findFiles,
  streamFile,
  createTempFile
};
//# sourceMappingURL=chunk-W4QWQKCP.js.map
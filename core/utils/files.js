const { join, resolve } = require('node:path');
const { existsSync, writeFileSync } = require('node:fs');

const getJsonDataFilePath = (filename, dataPath) => {
  const dataDirPath = dataPath || join(process.cwd(), '.data');
  return resolve(dataDirPath, filename);
}

const getJsonData = (filename, dataPath) => {
  const filePath = getJsonDataFilePath(filename, dataPath);
  if (!existsSync(filePath)) {
    return null;
  }
  return require(filePath);
}

const saveJsonData = (filename, data, dataPath) => {
  const filePath = getJsonDataFilePath(filename, dataPath);
  try {
    writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log('File created: ', filePath);
  } catch (error) {
    console.error('Error writing file:', error);
  }

  return filename;
}

module.exports = { getJsonData, saveJsonData, getJsonDataFilePath };

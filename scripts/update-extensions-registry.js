const path = require('path');
const fs = require('fs');

const extensionFolderName = 'Extensions';
const extensionsBasePath = path.join(__dirname, '..', extensionFolderName);

const writeJSONFile = (path, object) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, JSON.stringify(object, null, 2), (err) => {
      if (err) return reject(err);

      resolve();
    });
  });
};

const readFileContent = (filename) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, 'utf8', (err, content) => {
      if (err) return reject(err);

      resolve(content);
    });
  });
};

const readAllExtensions = () => {
  return new Promise((resolve, reject) => {
    fs.readdir(extensionsBasePath, (error, filenames) => {
      if (error) return reject(error);

      resolve(
        filenames.filter(
          (name) => name.endsWith('.json') && !name.endsWith('-header.json')
        )
      );
    });
  }).then((filenames) =>
    Promise.all(
      filenames.map((filename) =>
        readFileContent(path.join(extensionsBasePath, filename)).then(
          (content) => {
            return JSON.parse(content);
          }
        )
      )
    )
  );
};

readAllExtensions()
  .then((extensions) => {
    const allTagsSet = new Set();
    const extensionShortHeaders = [];

    return Promise.all(
      extensions.map((extension) => {
        // Convert back to the old format for tags.
        if (Array.isArray(extension.tags)) {
          extension.tags = extension.tags.join(',');
        }

        // Generate the headers of the extension
        const extensionShortHeader = {
          shortDescription: extension.shortDescription,
          extensionNamespace: extension.extensionNamespace,
          fullName: extension.fullName,
          name: extension.name,
          version: extension.version,
          url: `${extensionFolderName}/${extension.name}.json`,
          headerUrl: `${extensionFolderName}/${extension.name}-header.json`,
          tags: extension.tags,
          previewIconUrl: extension.previewIconUrl,
          eventsBasedBehaviorsCount: extension.eventsBasedBehaviors.length,
          eventsFunctionsCount: extension.eventsFunctions.length,
        };
        const extensionHeader = {
          ...extensionShortHeader,
          description: extension.description,
          iconUrl: extension.iconUrl,
        };

        extensionShortHeaders.push(extensionShortHeader);
        extension.tags.split(',').map((tag) => {
          allTagsSet.add(tag.trim().toLowerCase());
        });

        return writeJSONFile(
          path.join(extensionsBasePath, `${extension.name}-header.json`),
          extensionHeader
        );
      })
    ).then(() => {
      // Write the registry
      const registry = {
        '//': 'Autogenerated by scripts/update-extensions-registry.js',
        version: '0.0.1',
        allTags: Array.from(allTagsSet),
        extensionShortHeaders,
      };
      return writeJSONFile(
        path.join('..', 'extensions-registry.json'),
        registry
      );
    });
  })
  .then(
    () => {
      console.log(`✅ Headers and registry files successfully updated`);
    },
    (error) => {
      console.error(
        `⚠️ Error while generating headers and registry files:`,
        error
      );
    }
  );

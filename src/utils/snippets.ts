(async function() {
  const fs = require('fs').promises;
  const path = require('path');
  const xml2js = require('xml2js');

  const parser = new xml2js.Parser();
  const fpgaMemoryAttributes: any = {
    ' ': {
      prefix: 'intel',
      body: [
        'intel::'
      ],
      description: ' '
    }
  };
  const files = [path.join(__dirname, '/../../attributes/kernel.xml'), path.join(__dirname, '/../../attributes/loop.xml'), path.join(__dirname, '/../../attributes/memory.xml')];

  await Promise.all(files.map(async(file) => {
    const data = await fs.readFile(file, 'utf8');
    parser.parseStringPromise(data).then((result: any) => {
      const attributes = result.reference ? result.reference.refbody[0].table[0].tgroup[0].tbody[0].row : result.concept.conbody[0].table[0].tgroup[0].tbody[0].row;
      for (const att of attributes) {
        const name = att.entry[0].codeph[0].replace(/[[\]']+/g, '').replace('intel::', '');
        const description = att.entry[1]._ || att.entry[1].p[0]._ || att.entry[1].p[0];
        const prefix = att.entry[0].codeph[0].replace(/\(.*\)/, '').replace(/[[\]']+/g, '');
        fpgaMemoryAttributes[name] = {
          description,
          prefix,
          body: [prefix]
        };
      }
    });
  }));
  await fs.writeFile('snippets.json', JSON.stringify(fpgaMemoryAttributes, null, 4), function(err: Error) {
    if (err) throw err;
    console.log('File is rewritten successfully.');
  });
}());

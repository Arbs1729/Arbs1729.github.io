export default function (config) {
  config.addPassthroughCopy({ public: '.' });
  config.addPassthroughCopy({ 'src/styles/global.css': 'styles.css' });
  config.addWatchTarget('src/components/');
  config.addWatchTarget('src/data/');
  config.setServerOptions({ port: 4174 });
  return { templateFormats: ['11ty.js'], dir: { input: 'src/pages', output: 'dist' } };
}

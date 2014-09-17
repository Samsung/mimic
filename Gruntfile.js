module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-ts');
    grunt.initConfig({
      ts: {
          // A specific target
          build: {
              src: ["src/**/*.ts"],
              outDir: 'bin',
              //watch: 'test',
              options: {
                  target: 'es5',
                  module: 'commonjs',
                  sourceMap: true,
                  declaration: false,
                  removeComments: true
              },
          },
      },
  });
  grunt.registerTask('default', ['ts']);
}

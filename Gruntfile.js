module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-typescript');
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        typescript: {
            tscode: {
                src: ['*.ts'],
                dest: './',
                options: {
                    module: 'commonjs',
                    target: 'es5',
                    sourceMap: true,
                    declaration: false,
                    noImplicitAny: true
                }
            }
        }
    });
    grunt.registerTask('default', ['typescript']);
}

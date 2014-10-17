/*
 * Copyright (c) 2014 Samsung Electronics Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-ts');
    grunt.initConfig({
      ts: {
          // A specific target
          build: {
              src: ["src/**/*.ts", "test/**/*.ts"],
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

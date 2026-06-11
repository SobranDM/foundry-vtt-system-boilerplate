import inquirer from 'inquirer';
import replace from 'replace';
import { glob } from 'glob';
import fs from 'fs';
import path from 'path';

/**
 * System generator class.
 *
 * This class has several helper methods used to process files
 * for the `npm run generate` command. This is later called in
 * inquirer.promp().then() once user's terminal prompt answers
 * have been returned.
 */
class SystemGenerator {

  constructor(answers) {
    this.packageName = answers.packageName.trim();
    this.titleName = answers.titleName.trim();
    this.className = answers.className.trim();
    this.constantName = answers.constantName.trim();
    this.packageName = this.transformPackageName();
    this.className = this.transformClassName();
    this.constantName = this.transformConstantName();
    this.propName = this.packageName.replaceAll('-', '');
  }

  transformPackageName() {
    const packageName = this.packageName ?? '';
    return packageName.toLowerCase().replaceAll(/[^a-z\d]/g, '-');
  }

  transformClassName() {
    const className = this.className ?? this.packageName;
    return className.replaceAll(/[^a-zA-Z\d]/g, '');
  }

  transformConstantName() {
    const constantName = this.constantName ?? this.packageName;
    return constantName.toUpperCase().replaceAll(/[^A-Z\d]/g, '_');
  }

  cleanBuildDir() {
    fs.rmSync(`build`, { recursive: true, force: true });
  }

  copyFiles(files) {
    files.forEach(source => {
      fs.cpSync(source, `build/${this.packageName}/${source}`, { recursive: true }, (err) => {
        if (err) throw err;
      });
    });
  }

  replaceFileContents() {
    const replacements = [
      {
        pattern: new RegExp(/game\.boilerplate/g),
        replacement: `game.${this.propName}`
      },
      {
        pattern: new RegExp(/flags\.boilerplate/g),
        replacement: `flags.${this.propName}`
      },
      {
        pattern: 'boilerplate',
        replacement: this.packageName
      },
      {
        pattern: 'Boilerplate',
        replacement: this.className
      },
      {
        pattern: 'BOILERPLATE',
        replacement: this.constantName
      }
    ];

    replace({
      regex: 'Boilerplate',
      replacement: this.titleName,
      paths: [`./build/${this.packageName}/system.json`],
      silent: true
    });

    const replaceOptions = {
      paths: [`./build/${this.packageName}/`],
      recursive: true,
      silent: true
    };

    replacements.forEach(replacePair => {
      replace({
        regex: replacePair.pattern,
        replacement: replacePair.replacement,
        ...replaceOptions
      })
    });
  }

  renameFiles() {
    glob(`build/${this.packageName}/**/*boilerplate*.*`).then(files => {
      files.forEach(oldPath => {
        const file = path.basename(oldPath);
        const directory = path.dirname(oldPath);
        fs.rename(oldPath, `${directory}/${file.replaceAll('boilerplate', this.packageName)}`, (err) => {
          if (err) throw err;
        });
      })
    })
  }

  cleanPackageJson() {
    const buildRoot = `build/${this.packageName}`;
    fs.rmSync(`${buildRoot}/src/generate-boilerplate-system.mjs`, { force: true });
    fs.rmSync(`${buildRoot}/package-lock.json`, { force: true });
    fs.rmSync(`${buildRoot}/pnpm-lock.yaml`, { force: true });
    fs.rmSync(`${buildRoot}/pnpm-workspace.yaml`, { force: true });

    const pkgSrc = fs.readFileSync(`build/${this.packageName}/package.json`, "utf8");
    const pkgJson = JSON.parse(pkgSrc);
    delete pkgJson.scripts.generate;
    delete pkgJson.devDependencies.glob;
    delete pkgJson.devDependencies.renamer;
    delete pkgJson.devDependencies.replace;
    delete pkgJson.devDependencies.inquirer;
    fs.writeFileSync(`build/${this.packageName}/package.json`, JSON.stringify(pkgJson, null, '  '), 'utf8');
  }
}

inquirer
  .prompt([
    {
      type: 'input',
      name: 'packageName',
      message: 'Enter the package name of your system, such as "my-system" (alphanumeric characters and hyphens only):',
      default: 'my-system'
    },
    {
      type: 'input',
      name: 'titleName',
      message: 'Enter the formatted name of your system, such as "My System":',
      default: 'My System'
    },
    {
      type: 'input',
      name: 'className',
      message: 'Enter the name of your system for usage in JS classes, such as "MySystem" (alphanumeric characters only):',
      default: 'MySystem'
    },
    {
      type: 'input',
      name: 'constantName',
      message: 'Enter the name of your system for usage in constants, such as "MY_SYSTEM" (alphanumeric characters and underscores only):',
      default: 'MY_SYSTEM'
    }
  ])
  .then((answers) => {
    for (let [question, answer] of Object.entries(answers)) {
      if (!answer || !answer.length || answer.trim().length < 1) {
        throw new Error(`${question} cannot be empty.`);
      }
    }

    const generator = new SystemGenerator(answers);
    generator.cleanBuildDir();

    glob('*', { ignore: ['node_modules/**', 'build/**'] }).then(files => {
      generator.copyFiles(files);
      generator.replaceFileContents();
      generator.renameFiles();
      generator.cleanPackageJson();
    });

    console.log(`Success! Your system has been written to the build/${generator.packageName}/ directory.`);
  })
  .catch((error) => {
    console.error(error);
  });

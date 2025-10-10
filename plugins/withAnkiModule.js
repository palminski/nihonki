const {
    withDangerousMod,
    withMainApplication,
    withAppBuildGradle,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withAnkiModule(config) {
    config = withDangerousMod(config, [
        'android',
        (modConfig) => {
            const projectRoot = modConfig.modRequest.projectRoot;
            const srcDir = path.join(projectRoot, 'android-custom');
            const destDir = path.join(
                modConfig.modRequest.platformProjectRoot,
                'app/src/main/java/com/palminski/nihonki'
            );

            if (fs.existsSync(srcDir)) {
                fs.mkdirSync(destDir, {recursive: true});
                for(const file of fs.readdirSync(srcDir)) {
                    const from = path.join(srcDir, file);
                    const to = path.join(destDir, file);
                    fs.copyFileSync(from,to);
                }
                console.log(":) - SUCCEEDED IN COPYING ANKI JAVA FILES TO ANDROID PROJECT");
            }
            else
            {
                console.log("X - FAILED IN COPYING ANKI JAVA FILES TO ANDROID PROJECT");
            }
            return modConfig;
        }
    ]);

    config = withDangerousMod(config, [
        'android',
        (modConfig) => {
            const mainAppPath = path.join(
                modConfig.modRequest.platformProjectRoot,
                "app/src/main/java/com/palminski/nihonki/MainApplication.kt"
            );

            if(fs.existsSync(mainAppPath)) {
                let contents = fs.readFileSync(mainAppPath, "utf8");

                if(!contents.includes("import com.palminski.nihonki.AnkiPackage")) {
                    contents = contents.replace(
                        /import com.facebook\.react\.soloader\.OpenSourceMergedSoMapping/,
                        (match) => `${match}\nimport com.palminski.nihonki.AnkiPackage`
                    );
                }

                if(!contents.includes("packages.add(AnkiPackage())")) {
                    contents = contents.replace(
                        /(val packages = PackageList\(this\)\.packages[\s\S]*?)(return packages)/,
                        `$1 packages.add(AnkiPackage())\n   $2`
                    );
                }
                fs.writeFileSync(mainAppPath, contents);
                console.log(":) - SUCCEEDED IN COPYING packages.add(AnkiPackage()) to MainApplication.kt");
            }
            else
            {
                console.log("X - FAILED IN COPYING packages.add(AnkiPackage()) to MainApplication.kt");
            }
            return modConfig;
        }
    ]);

    

    config = withAppBuildGradle(config, (modConfig) => {
        if (!modConfig.modResults.contents.includes('implementation "com.ichi2.anki:api')) {
            modConfig.modResults.contents = modConfig.modResults.contents.replace(
                /dependencies\s*{([\s\S]*?)}/,
                'dependencies {\n   implementation("com.github.ankidroid:Anki-Android:api-v1.1.0") // AnkiDroid API\n' + '$1}'
            );
            console.log("ADDED ANKI DROID API GRADLE DEPENDENCY");
        }
        return modConfig;
    });

    config = withMainApplication(config, (modConfig) => {
        const contents = modConfig.modResults.contents;

        if(!contents.includes('new AnkiPackage()')) {
            const updated = contents.replace('import java.util.List;', 'import java.util.List;\nimport com.palminski.nihonki.AnkiPackage;')
            .replace(
                /(return Arrays\.asList\([^)]*)\)/,
                `$1, new AnkiPackage())`
            );
            modConfig.modResults.contents = updated;
            console.log('REGISTERED ANKIPACKAGE IN MAINAPPLICATION.JAVA');
        }
        return modConfig;
    });
    return config;
}
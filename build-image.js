#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const process_runner = require('./lib/process_runner');
const async = require('async');
const args = require('args');

args.options([
    {
        name: "image-repositories-directory",
        description: "The directory holding all image repositories",
        defaultValue: path.join(process.env.HOME, "Documents", "Projects", "GentlemanProgrammer")
    },
    {
        name: "repository",
        description: "The name of the git repository to build as an image"
    },
    {
        name: "config-file",
        description: "The name of the build configuration file",
        defaultValue: "build-config.json"
    },
    {
        name: "build-images",
        description: "Build images before pushing to the docker repository. Use 'no-build-images' to skip this step.",
        defaultValue: true
    },
    {
        name: "push-images",
        description: "Push images to the docker repository",
        defaultValue: false
    },
    {
        name: "verbose",
        description: "Do not emit progress to the console",
        defaultValue: true
    },
    {
        name: "parallelism",
        description: "How many repositories should be processed in parallel",
        defaultValue: 1
    }
]);

const flags = args.parse(process.argv, { name: "build-image.js" });

if ("repository" in flags === false) {
    if (process.argv.length > 2) {
        // NOTE: We're only handling one repository at a time, but we could
        // easily support more using this method
        flags.repository = process.argv[process.argv.length - 1];
    }
    else {
        console.error("Please specify a repository with the --repository flag");
        process.exit(1);
    }
}

// Used for testing arg processing results
if (false) {
    console.log(JSON.stringify(flags, null, 2));
    console.log(process.argv);
    process.exit(0);
}


// load configuration
const repositories = flags.imageRepositoriesDirectory;
const repository = flags.repository;
const config_file = flags.configFile;
const build_images = flags.buildImages;
const push_images = flags.pushImages;
const verbose = flags.verbose;
const parallelism = flags.parallelism;

// make sure the environment is as we expect
const repository_path = path.join(repositories, repository);
const config_file_path = path.join(repository_path, config_file);

if (fs.existsSync(repository_path) === false) {
    console.error("repository path does not exist: %s", repository_path);
    process.exit(1);
}

if (fs.existsSync(config_file_path) === false) {
    console.error("configuration file does not exist: %s", config_file_path);
    process.exit(1);
}

// load configuration
const config = require(config_file_path);


function log(message) {
    if (verbose) {
        console.log(message);
    }
}


// build a single build_info
function build(build_info, done) {
    async.waterfall([
        function(next) {
            // docker build -q -t <image>:<tag> [<build-args>]* .
            const args = [
                "build",
                "--compress",
                "-t",
                build_info.image
            ];

            if (verbose === false) {
                args.splice(1, 0, "-q")
            }

            build_info.build_args.forEach(function(build_arg) {
                args.push("--build-arg");
                args.push(build_arg);
            });

            args.push(".");

            console.log(`building ${build_info.image}`);

            process_runner(
                "docker",
                args,
                build_info.options,
                next
            );
        },
        function(next) {
            if (push_images) {
                console.log(`pushing ${build_info.image}`);

                // docker push <image>:<tag>
                process_runner(
                    "docker",
                    [
                        "push",
                        build_info.image
                    ],
                    build_info.options,
                    next
                )
            }
            else {
                next(null);
            }
        }],
        done
    );
}


// *****


// build list of builds
const build_infos = [];

config.base_versions.forEach(function(base_version) {
    if ("installers" in config && config.installers.length > 0) {
        const first_hyphen = base_version.indexOf("-");
        const image_version = (first_hyphen !== -1)
            ? config.image_version + base_version.substring(first_hyphen)
            : config.image_version

        config.installers.forEach(function(installer) {
            build_infos.push({
                "image": `${config.image_name}:${image_version}-${installer.version}`,
                "build_args": [
                    `REPO_TAG=${config.image_version}`,
                    `BASE_VERSION=${base_version}`,
                    `URL=${installer.url}`,
                    `FILENAME=${installer.filename}`
                ],
                "options": {
                    "cwd": repository_path,
                    "stdio": "inherit"
                }
            })
        });
    }
    else {
        build_infos.push({
            "image": `${config.image_name}:${config.image_version}`,
            "build_args": [
                `REPO_TAG=${config.image_version}`,
                `BASE_VERSION=${base_version}`
            ],
            "options": {
                "cwd": repository_path,
                "stdio": "inherit"
            }
        });
    }
});

log(JSON.stringify(build_infos, null, 2));

// build them
if (build_images) {
    async.eachLimit(
        build_infos,
        parallelism,
        build,
        function(err) {
            if (err) {
                console.log(`err = ${err}`);
                process.exit(1);
            }

            console.log("done");
        }
    );
}

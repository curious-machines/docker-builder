# Docker Builder

- [Introduction](#introduction)
- [Configuration File Format](#configuration-file-format)
- [Tags](#tags)

---

# Introduction

A tool to help with building docker images.

# Configuration File Format

It is assumed that everything needed to build in an image exists in a single directory. Each directory must contain a `Dockerfile` and a configuration file named `build-config.json`. The JSON configuration uses the following format:

```json
{
  "image_name": "thelonious/ubuntu",
  "image_version": "0.0.1",
  "base_image": "ubuntu",
  "base_versions": [ "18.04" ],
  "installers": {
    "version": "1.2.3",
    "filename": "some-installer",
    "url": "https://.../some-installer"
  }
}
```

## Image Name

This is the fully qualified name of the image being created. In this example, an image named `ubuntu` will be created under the `thelonious` namespace/account.

## Image Version

This is the tag you wish to associated with this image.

## Base Image

If the image is built on top of another, use the fully qualified name (minus the version number).

## Base Versions

It is possible that you will need to build multiple images, each based on different base versions. Enter a list of all base image version numbers in an array.

## Installers

This is an optional property

It is possible that multiple images will need to be created, one for each version of a particular piece of software being installed onto the image. Note that this differs from multiple base version numbers. It is entirely possible that each base version will need each version of software installed. Between `base_versions` and the list of installers, you will get the cartesion product of the two lists. For example, if you have two `base_versions` and three `installers`, you will end up with six images.

### Version

The software version number

### Filename

The software installer name

### URL

A URL to the installer

# Tags

If a configuration lists only a single `base_version`, then the tag listed in `image_version` will be used as is. However, when multiple `base_version` values exist, each image will be tagged by combining the `image_version` followed by the specific `base_version` being used.

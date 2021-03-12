# TWPUB Tools

## Setup

Clone this repository and install its dependencies:

```
npm install
```

To install subsequent upstream changes from TiddlyWiki 5:

```
npm update
```

## Develop

* Converts the library of epubs in `/epubs` into a plugin library serving TWPUBs
* Builds a TiddlyWiki including the TWPUB tools plugin
* Runs an HTTP server to serve the wiki and the plugin library

```
npm start
```

## Build

Builds the files for the app without running the HTTP server

```
npm run build
```

The output files will be in `./output`.

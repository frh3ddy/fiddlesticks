# Fiddlesticks

Web based typography for word art, logos, and fun. This is the first web-based application to provide free-form text warp (AFAIK).

<img src="/fstx sketch - obstacles.png?raw=true" height="400">

## Drawing app

<img src="/fstx-demo.gif?raw=true" height="400">

The drawing app provides a number of features to allow drawing with text.

* Warp text region to match any shape
* Change text font and foreground/background color
* Intuitive drag and zoom movement
* Auto-save to Amazon S3
* Upload tracing image to draw text upon
* Export to SVG or PNG (multiple resolutions)

Both apps are built using Snabbdom (alternative to React DOM) and RxJS state channels inspired by Flux and Redux. The [Store object](./client/sketchEditor/Store.ts) coordinates state transitions and actions.

## Builder app

<img src="/fstx-builder-demo.gif?raw=true" height="400">

The builder app generates a pre-formatted drawing based on parameters the user provides. The app is designed to support  templates for formatting and user interaction, essentially self-contained tools. There is currently just one template implemented, [source here](./client/sketchBuilder/templates/Dickens.ts).

## Usage

This version of the application is designed to use S3 bucket for storage. 
Until a disk storage option is available for localhost, you can use this:

```
set S3_BUCKET=your-bucket-name
set AWS_ACCESS_KEY=your-access-key
set AWS_SECRET_KEY=your-secret-key
npm install
npm start
```

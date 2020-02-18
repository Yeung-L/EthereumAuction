const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: 'development',
  entry: "./src/index.js",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new CopyWebpackPlugin([{ from: "./src/index.html", to: "index.html" },
	{from: "./src/list-item.html",to:"list-item.html"},
	{from: "./src/Amble-Regular-webfont.ttf",to:"Amble-Regular-webfont.ttf"},
	{from: "./src/delivery.html",to:"delivery.html"},
	{from: "./src/easing.js",to:"easing.js"},
	{from: "./src/easy-responsive-tabs.css",to:"easy-responsive-tabs.css"},
	{from: "./src/easyResponsiveTabs.js",to:"easyResponsiveTabs.js"},
	{from: "./src/global.css",to:"global.css"},
	{from: "./src/jquery.accordion.js",to:"jquery.accordion.js"},
	{from: "./src/jquery.easing.js",to:"jquery.easing.js"},
	{from: "./src/jquery-1.7.2.min.js",to:"jquery-1.7.2.min.js"},
	{from: "./src/move-top.js",to:"move-top.js"},
	{from: "./src/preview.html",to:"preview.html"},
	{from: "./src/script.js",to:"script.js"},
	{from: "./src/slider.css",to:"slider.css"},
	{from: "./src/slides.min.jquery.js",to:"slides.min.jquery.js"},
	{from: "./src/startstop-slider.js",to:"startstop-slider.js"},
	{from: "./src/style.css",to:"style.css"},
	{from: "./src/slides.min.jquery.js",to:"slides.min.jquery.js"},
	{from: "./src/product_list.html",to:"product_list.html"},
	{from: "./src/add_product.html",to:"add_product.html"},
	{from: "./src/logo.png",to:"logo.png"},
	{from: "./src/product_detail.html",to:"product_detail.html"}]),
  ],
  devServer: { contentBase: path.join(__dirname, "dist"), compress: true },
};

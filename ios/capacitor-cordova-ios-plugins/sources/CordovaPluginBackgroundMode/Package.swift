// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "CordovaPluginBackgroundMode",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CordovaPluginBackgroundMode",
            targets: ["CordovaPluginBackgroundMode"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.3.4"),
        .package(name: "CordovaPluginDevice", path: "../CordovaPluginDevice")
    ],
    targets: [
        .target(
            name: "CordovaPluginBackgroundMode",
            dependencies: [
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CordovaPluginDevice", package: "CordovaPluginDevice")
            ],
            path: ".",
            resources: [
                .copy("resources/appbeep.wav")
            ],
            publicHeadersPath: "."
        )
    ]
)
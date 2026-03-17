#!/usr/bin/env node
/**
 * Синхронизирует version и androidVersionCode из package.json в android/app/build.gradle.
 * Единый источник версии — package.json.
 */
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const pkgPath = path.join(rootDir, 'package.json')
const gradlePath = path.join(rootDir, 'android', 'app', 'build.gradle')

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const versionName = pkg.version
const versionCode = pkg.androidVersionCode != null ? pkg.androidVersionCode : 1

let gradle = fs.readFileSync(gradlePath, 'utf8')
gradle = gradle.replace(/(\bversionCode\s+)\d+/, `$1${versionCode}`)
gradle = gradle.replace(/(\bversionName\s+")[^"]+"/, `$1${versionName}"`)

fs.writeFileSync(gradlePath, gradle)
console.log(`sync-version: android/app/build.gradle → versionName "${versionName}", versionCode ${versionCode}`)

import {expect} from 'chai'

import {parseDiff} from '../../../src/lib/diff/parser.js'

describe('diff/parser', () => {
  const sampleDiff = `diff --git a/package.json b/package.json
index abc1234..def5678 100644
--- a/package.json
+++ b/package.json
@@ -10,7 +10,7 @@
   },
   "dependencies": {
     "@oclif/core": "^4",
-    "old-package": "^1.0.0"
+    "new-package": "^2.0.0"
   },
   "devDependencies": {
`

  it('parses a unified diff', () => {
    const result = parseDiff(sampleDiff)

    expect(result.files).to.be.an('array').with.lengthOf(1)
    expect(result.files[0].oldPath).to.equal('package.json')
    expect(result.files[0].newPath).to.equal('package.json')
  })

  it('extracts hunks from the diff', () => {
    const result = parseDiff(sampleDiff)
    const file = result.files[0]

    expect(file.hunks).to.be.an('array').with.lengthOf(1)
    expect(file.hunks[0].changes).to.be.an('array')
  })

  it('identifies file modification type', () => {
    const result = parseDiff(sampleDiff)

    expect(result.files[0].type).to.equal('modify')
  })

  it('handles empty diff', () => {
    const result = parseDiff('')

    expect(result.files).to.be.an('array').with.lengthOf(0)
  })

  it('parses added file diff', () => {
    const addDiff = `diff --git a/newfile.txt b/newfile.txt
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/newfile.txt
@@ -0,0 +1,3 @@
+line 1
+line 2
+line 3
`
    const result = parseDiff(addDiff)

    expect(result.files).to.be.an('array').with.lengthOf(1)
    expect(result.files[0].type).to.equal('add')
    expect(result.files[0].newPath).to.equal('newfile.txt')
  })

  it('parses deleted file diff', () => {
    const deleteDiff = `diff --git a/oldfile.txt b/oldfile.txt
deleted file mode 100644
index abc1234..0000000
--- a/oldfile.txt
+++ /dev/null
@@ -1,3 +0,0 @@
-line 1
-line 2
-line 3
`
    const result = parseDiff(deleteDiff)

    expect(result.files).to.be.an('array').with.lengthOf(1)
    expect(result.files[0].type).to.equal('delete')
    expect(result.files[0].oldPath).to.equal('oldfile.txt')
  })
})

## v1.2.0 [2025-04-18]

- Remove the limitation on rendering only DOCX files (allow also XLSX and PPTX templates)

## v1.1.2 [2024-09-17]

- Fix issue #7: sometimes, under unclear circumstances, rendering failed with an error `NodeOperationError: Unknown input file type`.
  Thanks to [@JV300381](https://github.com/JV300381) for reporting the issue and helping confirm that it was solved!

## v1.1.1 [2024-02-02]

- Fix issue #4: if the template binary file had been stored to disk by N8N (as opposed to keeping it in memory), the Render operation would fail with the error `ERROR: The "data" argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received an instance of Promise`. This was due to [a breaking change in N8N v1.9.0](https://github.com/n8n-io/n8n/blob/master/packages/cli/BREAKING-CHANGES.md#what-changed-3). Thanks to [@altvk88](https://github.com/altvk88) for reporting the issue and helping diagnose it!

## v1.1.0 [2023-08-25]

- Add the ability to set [render options](https://carbone.io/api-reference.html#options). Thanks, [@mrtnblv](https://github.com/mrtnblv)!

## v1.0.1 [2023-05-30]

- Add docs suggesting alternative for PDF rendering when running N8N on Docker (i.e. Gotenberg)

## v1.0.0 [2023-50-27]

- Initial release

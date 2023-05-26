# n8n-nodes-carbonejs

This is an n8n community node. It lets you use [the Carbone JS library](https://carbone.io/) in your n8n workflows.

Carbone is a report generator that lets you render JSON data into DOCX, PDF, XLSX and more formats.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

> **NOTE:** Carbone is licensed under the [Carbone Community License (CCL)](https://github.com/carboneio/carbone/blob/master/LICENSE.md), which says that "Roughly speaking, as long as you are not offering Carbone Community Edition Software as a hosted Document-Generator-as-a-Service like Carbone Cloud, you can use all Community features for free.". AFAICT, this means that this plugin must also be distributed under CCL, and that you can't install it in a N8N instance and then use it to provide document generation as a service. You can use it for "your own internal business purposes" and "value-added products or services", as long as they aren't primarily document generation services.

[Installation](#installation)  
[Operations](#operations)  
[Compatibility](#compatibility)  
[Usage](#usage)  <!-- delete if not using this section -->  
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

### Render Document

Must receive an input item with both `$json` and `$binary` keys. The `$json` key may be used to compose the "context", which will be provided to the templating engine. The `$binary` key should contain a DOCX document that contains a valid Carbone template.

## Compatibility

This plugin has been developed and tested on N8N version 0.228.2. It should work with older versions too, but it hasn't been tested.

## Usage

The `Render DOCX` node needs to receive data items with _both_ JSON and [binary data](https://docs.n8n.io/courses/level-two/chapter-2/#binary-data). The binary data is the template, and the JSON data will be the context passed to the template.

To generate these data items, you'll probably want to use a [Merge Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.merge), with Mode set to **Combine** and Combination Mode set to **Multiplex**. This generates a cross-join of all data in Input A and Input B (i.e., every possible combination of items). If you only input _one_ item in the template, you'll get one item out for each different JSON context.

See below for an example:

![a sample workflow that generates sample JSON data, then reads a template from disk, then merges the JSON documents with the template, and then renders each template+JSON combo with the Carbone node](./images/sample_wf.png)

The Merge node receives 3 items in its Input A, and 1 item in its input B. Every possible combination yields 3*1 = 3 output combinations, each with the same template but different JSON content.

The data items output by the node will also have JSON and binary data. The JSON data is the context that was used for rendering the document (which is not necessarily the same as the node's input `$json` key), and the binary data is another DOCX document, rendered from the input Template.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [General Carbone docs](https://carbone.io/documentation.html)
* [A short tutorial on template design](https://help.carbone.io/en-us/article/how-to-create-a-template-nm284z)
* [Detailed docs on template design](https://carbone.io/documentation.html#design-your-first-template)




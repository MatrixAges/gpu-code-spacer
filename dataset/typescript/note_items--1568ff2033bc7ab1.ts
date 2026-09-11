export default {
      "Note.Setting": {
            "type": "object",
            "properties": {
                  "toc": {
                        "type": "string",
                        "enum": [
                              "default",
                              "visible",
                              "minimize",
                              "hidden"
                        ]
                  },
                  "use_content_heading": {
                        "type": "boolean"
                  },
                  "show_heading_level": {
                        "type": "boolean"
                  },
                  "serif": {
                        "type": "boolean"
                  },
                  "small_text": {
                        "type": "boolean"
                  },
                  "count": {
                        "type": "boolean"
                  }
            },
            "required": [
                  "toc",
                  "use_content_heading",
                  "show_heading_level",
                  "serif",
                  "small_text",
                  "count"
            ]
      },
      "Note.Item": {
            "type": "object",
            "properties": {
                  "file_id": {
                        "type": "string",
                        "maxLength": 30
                  },
                  "id": {
                        "type": "string",
                        "maxLength": 30
                  },
                  "prev": {
                        "type": "string"
                  },
                  "next": {
                        "type": "string"
                  },
                  "content": {
                        "type": "string"
                  },
                  "create_at": {
                        "type": "number"
                  },
                  "update_at": {
                        "type": "number"
                  },
                  "extends": {
                        "type": "string"
                  }
            },
            "required": [
                  "file_id",
                  "id",
                  "content",
                  "create_at"
            ]
      }
} as const
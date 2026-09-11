export default {
      "KV.Item": {
            "type": "object",
            "properties": {
                  "key": {
                        "type": "string",
                        "maxLength": 120
                  },
                  "value": {
                        "type": "string"
                  },
                  "update_at": {
                        "type": "number"
                  }
            },
            "required": [
                  "key",
                  "value"
            ]
      }
} as const
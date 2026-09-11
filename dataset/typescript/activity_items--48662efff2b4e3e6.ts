export default {
      "Activity.Item": {
            "type": "object",
            "properties": {
                  "id": {
                        "type": "string",
                        "maxLength": 30
                  },
                  "module": {
                        "type": "string",
                        "maxLength": 15
                  },
                  "file_id": {
                        "type": "string",
                        "maxLength": 30
                  },
                  "name": {
                        "type": "string"
                  },
                  "action": {
                        "type": "string"
                  },
                  "context": {
                        "type": "string"
                  },
                  "update_at": {
                        "type": "number"
                  },
                  "extends": {
                        "type": "string"
                  }
            },
            "required": [
                  "id",
                  "module",
                  "file_id",
                  "name",
                  "action"
            ]
      },
      "Activity.TodoAction": {
            "type": "string",
            "enum": [
                  "insert",
                  "check"
            ]
      },
      "Activity.PomoAction": {
            "type": "string",
            "enum": [
                  "work",
                  "break"
            ]
      },
      "Activity.Action": {
            "type": "string",
            "enum": [
                  "work",
                  "break"
            ]
      }
} as const
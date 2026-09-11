export default {
      "DirTree.Item": {
            "type": "object",
            "properties": {
                  "module": {
                        "type": "string",
                        "maxLength": 30
                  },
                  "type": {
                        "type": "string",
                        "enum": [
                              "dir",
                              "file"
                        ]
                  },
                  "id": {
                        "type": "string",
                        "maxLength": 30
                  },
                  "name": {
                        "type": "string"
                  },
                  "create_at": {
                        "type": "number"
                  },
                  "pid": {
                        "type": "string"
                  },
                  "prev_id": {
                        "type": "string"
                  },
                  "next_id": {
                        "type": "string"
                  },
                  "icon": {
                        "type": "string"
                  },
                  "icon_hue": {
                        "type": "number"
                  },
                  "update_at": {
                        "type": "number"
                  },
                  "backup_at": {
                        "type": "number"
                  },
                  "projects": {
                        "type": "array",
                        "items": {
                              "type": "string"
                        }
                  },
                  "extends": {
                        "type": "string"
                  }
            },
            "required": [
                  "module",
                  "type",
                  "id",
                  "name",
                  "create_at"
            ]
      },
      "DirTree.Items": {
            "type": "array",
            "items": {
                  "type": "object",
                  "properties": {
                        "module": {
                              "type": "string",
                              "maxLength": 30
                        },
                        "type": {
                              "type": "string",
                              "enum": [
                                    "dir",
                                    "file"
                              ]
                        },
                        "id": {
                              "type": "string",
                              "maxLength": 30
                        },
                        "name": {
                              "type": "string"
                        },
                        "create_at": {
                              "type": "number"
                        },
                        "pid": {
                              "type": "string"
                        },
                        "prev_id": {
                              "type": "string"
                        },
                        "next_id": {
                              "type": "string"
                        },
                        "icon": {
                              "type": "string"
                        },
                        "icon_hue": {
                              "type": "number"
                        },
                        "update_at": {
                              "type": "number"
                        },
                        "backup_at": {
                              "type": "number"
                        },
                        "projects": {
                              "type": "array",
                              "items": {
                                    "type": "string"
                              }
                        },
                        "extends": {
                              "type": "string"
                        }
                  },
                  "required": [
                        "module",
                        "type",
                        "id",
                        "name",
                        "create_at"
                  ]
            }
      }
} as const
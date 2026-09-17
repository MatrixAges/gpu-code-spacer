import { workflow } from '@jlarky/gha-ts/workflow-types';

export default workflow({
  name: "Build and deploy web",
  on: {
    push: {
      branches: [
        "master"
      ]
    },
    pull_request: {
      branches: [
        "master"
      ]
    },
    workflow_dispatch: {}
  },
  permissions: {
    contents: "read"
  },
  concurrency: {
    group: "pages-${{ github.ref }}",
    "cancel-in-progress": true
  },
  jobs: {
    build: {
      "runs-on": "ubuntu-latest",
      "timeout-minutes": 10,
      steps: [
        {
          uses: "actions/checkout@v6"
        },
        {
          uses: "mlugg/setup-zig@v2",
          with: {
            version: "0.16.0"
          }
        },
        {
          uses: "actions/setup-node@v6",
          with: {
            "node-version": 24,
            cache: "npm"
          }
        },
        {
          run: "npm ci"
        },
        {
          run: "npm run build:workflows -- --check"
        },
        {
          run: "npm run build:web"
        },
        {
          run: "npm pack --dry-run"
        },
        {
          uses: "actions/upload-pages-artifact@v4",
          with: {
            path: "web-dist"
          }
        }
      ]
    },
    deploy: {
      if: "github.event_name != 'pull_request' && github.ref == 'refs/heads/master'",
      needs: "build",
      "runs-on": "ubuntu-latest",
      "timeout-minutes": 10,
      permissions: {
        pages: "write",
        "id-token": "write"
      },
      environment: {
        name: "github-pages",
        url: "${{ steps.deployment.outputs.page_url }}"
      },
      steps: [
        {
          uses: "actions/configure-pages@v5"
        },
        {
          uses: "actions/deploy-pages@v4",
          id: "deployment"
        }
      ]
    }
  }
});

# Modelix Diffs in Pull Requests

**Modelix does not longer provide the functionality used by this action and the project has been archived.**

Posts likes to the current diff of a pull request pointing to your modelix instance and updates the links on changes
in the pull request. 

## Usage 

### Create Workflow

Create a workflow (eg: `.github/workflows/modelix.yml` see [Creating a Workflow file](https://help.github.com/en/articles/configuring-a-workflow#creating-a-workflow-file)) to utilize the modelix action with content:

```
name: Modelix URL

on: 
  pull_request_target:
    types: [synchronize, opened, reopened]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: coolya/action-pr-link@v1.0
      with:
        repo-token: "${{ secrets.GITHUB_TOKEN }}"
        modelix-url: ""  
```

_Note: This grants access to the `GITHUB_TOKEN` so the action can make calls to GitHub's rest API make sure the vent is
set to `pull_request_target` to prevent leaking it._

Setting the `types` to a specific subset prevents the action from spamming your comments since it will post a comment each
time it is trigger. The types `synchronize`, `opened` and `reopened` should cover most of the use cases. See [Events that trigger workflows](https://docs.github.com/en/free-pro-team@latest/actions/reference/events-that-trigger-workflows#pull_request_target). 

#### Inputs

Various inputs are defined in [`action.yml`](action.yml) to let you configure the modelix action:

| Name | Description | Default |
| - | - | - |
| `repo-token` | Token to use to authorize modelix changes. Typically the GITHUB_TOKEN secret | N/A |
| `modelix-url` | Root URL of the modelix instance running the diff service | N/A`

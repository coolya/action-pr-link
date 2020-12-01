import * as core from "@actions/core";
import * as github from "@actions/github";
import { GitHub } from "@actions/github/lib/utils";
import { Minimatch, IMinimatch } from "minimatch";
import deburr from 'lodash.deburr';


function getPrNumber(): number | undefined {
    const pullRequest = github.context.payload.pull_request; 
    if (!pullRequest) {
        return undefined;
    }

    return pullRequest.number;
}


async function getChangedFiles(
    client: InstanceType<typeof GitHub>,
    prNumber: number,
    page: number = 1
): Promise<string[]> {
    const listFilesResponse = await client.pulls.listFiles({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: prNumber,
        per_page: 100,
        page: page
    })

    const changedFiles = listFilesResponse.data.map(x => x.filename)

    core.debug("found changed files:");
    for (const file of changedFiles) {
        core.debug("  " + file);
    }

    if (changedFiles.length == 0) {
        return changedFiles
    } else {
        core.debug("processing next batch")
        const nextBatch = await getChangedFiles(client, prNumber, page + 1)
        return changedFiles.concat(nextBatch)
    }
}

async function run() {
    try {
        const token = core.getInput("repo-token", { required: true });
        const modelixUrl = core.getInput("modelix-url", { required: true });
        const prNumber = getPrNumber();
        if (!prNumber) {
            core.warning("Could not get pull request number from context, exiting");
            return;
        }

        const client = github.getOctokit(token);
        const { data: pullRequest } = await client.pulls.get({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            pull_number: prNumber
        });

        if (pullRequest.state == "closed") {
            core.info(`pull request #${prNumber} is closed. Skipping.`)
            return;
        }

        if (pullRequest.locked) {
            core.info(`pull request #${prNumber} is locked. Skipping.`)
            return;
        }

        core.debug(`fetching changed files for pr #${prNumber}`);
        const changedFiles: string[] = await getChangedFiles(client, prNumber);

        const filePerModel = new Minimatch("**\.mps");
        const filePerRoot = new Minimatch("**\.mpsr");
        const filePerRootMetadata = new Minimatch("**\.model");
        const languageFile = new Minimatch("**\.mpl");
        const solutionFile = new Minimatch("**\.msd");

        const matchers = [filePerModel, filePerRoot, filePerRootMetadata, languageFile, solutionFile];


        var matched = false;
        for (const file of changedFiles) {
            for (const matcher of matchers) {
                if (!matched) {
                    matched = matcher.match(file)
                }
            }
            if (matched) { break; }
        }

        if (!matched) {
            core.info("no MPS related files changed in this PR. Skipping!");
            return;
        }

        core.debug("matched")
        const base = pullRequest.base.sha;
        const head = pullRequest.head.sha;
        const diffUrl = `${modelixUrl}/github/${github.context.repo.owner}/${github.context.repo.repo}/diff/${base}/${head}`

        await client.issues.createComment({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            issue_number: prNumber,
            body: `You can view the diff at: ${diffUrl}`
        });

    } catch (error) {
        core.error(error);
        core.setFailed(error.message);
    }
}

run();
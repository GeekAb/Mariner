import { GitHubIssueFetcher, GitHubIssue, GitHubLabelEdge } from './gitHubIssueFetcher';
import { Config } from './config';

export interface Issue {
    title: string;
    createdAt: string;
    repositoryNameWithOwner: string;
    url: string;
    updatedAt: string;
    labels: string[];
}

export type RepoName = string;

export type IssuesByRepoName = Map<RepoName, Issue[]>;

export class IssueFinder {
    private readonly config: Config;
    private readonly fetcher: GitHubIssueFetcher;

    public constructor(config: Config) {
        this.config = config;
        this.fetcher = new GitHubIssueFetcher(this.config);
    }

    public async findIssues(
        token: string,
        repositoryIdentifiers: string[]
    ): Promise<IssuesByRepoName> {
        const gitHubIssues: GitHubIssue[] = [];
        for (const label of this.config.labelsToSearch) {
            const result = await this.fetcher.fetchMatchingIssues(
                token,
                label,
                repositoryIdentifiers
            );
            gitHubIssues.push(...result);
        }

        const arrayOfIssues = gitHubIssues.map((gitHubIssue) => {
            const issue = this.convertFromGitHubIssue(gitHubIssue);

            return issue;
        });

        const uniqueIssues = this.omitDuplicates(arrayOfIssues);

        const issuesByRepo = new Map<RepoName, Issue[]>();
        uniqueIssues.forEach((issue) => {
            const repo = issue.repositoryNameWithOwner;
            const existing = issuesByRepo.get(repo) || [];
            existing.push(issue);
            issuesByRepo.set(repo, existing);
        });

        return issuesByRepo;
    }

    private convertFromGitHubIssue(node: GitHubIssue): Issue {
        const issue: Issue = {
            title: node.title,
            createdAt: node.createdAt,
            repositoryNameWithOwner: node.repository.nameWithOwner,
            url: node.url,
            updatedAt: node.updatedAt,
            labels: this.convertFromGitHubLabels(node.labels.edges),
        };

        return issue;
    }

    private convertFromGitHubLabels(edges: GitHubLabelEdge[]) {
        const labels = edges.map((edge) => {
            return edge.node.name;
        });

        return labels;
    }

    private omitDuplicates(issues: Issue[]): Issue[] {
        const map = new Map<RepoName, Issue>();
        issues.forEach((issue) => {
            map.set(issue.url, issue);
        });
        const uniqueIssues: Issue[] = Array.from(map.values());

        return uniqueIssues;
    }
}

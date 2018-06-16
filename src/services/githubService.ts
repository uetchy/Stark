import axios from 'axios'
import * as parse from 'date-fns/parse'
import * as octokit from '@octokit/rest'

export class Github {
  client: octokit

  constructor(accessToken = '') {
    this.client = new octokit({
      headers: {
        'user-agent': 'Stark',
        accept: 'application/vnd.github.v3.star+json',
      },
    })
    this.client.authenticate({ type: 'oauth', token: accessToken })
  }

  async starredRepos(callback: Function) {
    const _client = this.client

    function _pager(
      response: octokit.AnyResponse
    ): Promise<octokit.AnyResponse> {
      console.log('got response:', response.data.length)
      console.log('remain', response.headers['x-ratelimit-remaining'])

      for (const star of response.data) {
        const record = <API.Response>{
          id: star.repo.id,
          name: star.repo.name,
          owner: star.repo.owner.login,
          full_name: star.repo.full_name,
          description: star.repo.description,
          url: star.repo.url,
          html_url: star.repo.html_url,
          clone_url: star.repo.clone_url,
          starred_at: parse(star.starred_at),
          created_at: parse(star.repo.created_at),
          pushed_at: parse(star.repo.pushed_at),
          homepage: star.repo.homepage,
          size: star.repo.size,
          stargazers_count: star.repo.stargazers_count,
          subscribers_count: star.repo.subscribers_count,
          forks_count: star.repo.forks_count,
          open_issues_count: star.repo.open_issues_count,
          language: star.repo.language,
          readme: null,
        }

        callback(record, response.headers.link)
      }

      if (_client.hasNextPage(response.headers)) {
        console.log('goto next')
        return _client.getNextPage(response.headers).then(_pager)
      }

      console.log('no more pages')
      Promise.resolve()
    }

    return _client.activity
      .getStarredRepos({
        per_page: 30,
        page: 100,
      })
      .then(_pager)
  }

  async starredWithReadme(callback: Function) {
    const _client = this.client

    async function _pager(
      response: octokit.AnyResponse
    ): Promise<octokit.AnyResponse> {
      console.log('got response:', response.data.length)
      console.log('remain', response.headers['x-ratelimit-remaining'])

      for (const star of response.data) {
        console.log('fetching readme:', star.repo.full_name)

        let readme = ''
        try {
          console.log({ owner: star.repo.owner.login, repo: star.repo.name })
          const readmeResponse = await _client.repos.getReadme({
            owner: star.repo.owner.login,
            repo: star.repo.name,
          })
          readme = Buffer.from(readmeResponse.data.content, 'base64').toString()
          console.log('readme length:', readme.length)
        } catch (err) {
          console.log('readme not found', err)
        }

        const record = <API.Response>{
          id: star.repo.id,
          name: star.repo.name,
          owner: star.repo.owner.login,
          full_name: star.repo.full_name,
          description: star.repo.description,
          url: star.repo.url,
          html_url: star.repo.html_url,
          clone_url: star.repo.clone_url,
          starred_at: parse(star.starred_at),
          created_at: parse(star.repo.created_at),
          pushed_at: parse(star.repo.pushed_at),
          homepage: star.repo.homepage,
          size: star.repo.size,
          stargazers_count: star.repo.stargazers_count,
          subscribers_count: star.repo.subscribers_count,
          forks_count: star.repo.forks_count,
          open_issues_count: star.repo.open_issues_count,
          language: star.repo.language,
          readme,
        }

        callback(record)
        Promise.resolve()
      }

      if (_client.hasNextPage(response.headers.link)) {
        console.log('goto next')
        return _client.getNextPage(response.headers.link).then(_pager)
      }

      console.log('no more pages')
    }

    _client.activity
      .getStarredRepos({
        per_page: 100,
      })
      .then(_pager)
  }
}
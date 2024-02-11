import Project from 'App/Models/Project'
import DomainService from 'App/Services/DomainService'
import Visitor from 'App/Models/Visitor'
import VisitorService from 'App/Services/VisitorService'
import PageViewService from 'App/Services/PageViewService'

export type ProjectWithUniqueVisitorCountLast24Hours = {
  project: Project
  nbUniqueVisitorLast24Hours: number
}

export default class ProjectService {
  /**
   * Retrieves all projects.
   * @returns Promise<Project[]>
   */
  public static async getAll(): Promise<Array<Project>> {
    return await Project.all()
  }

  /**
   * Retrieves a project by its ID.
   * @param id - Project ID
   * @returns Promise<Project>
   */
  public static async getById(id: number): Promise<Project> {
    return await Project.findOrFail(id)
  }

  /**
   * Retrieves visitors for a project by its ID.
   * @param id - Project ID
   * @returns Promise<Visitor[]>
   */
  public static async getVisitors(id: number): Promise<Array<Visitor>> {
    const projectsWithVisitors: Project = await Project.query()
      .where('id', id)
      .preload('visitors')
      .firstOrFail()

    return projectsWithVisitors.visitors
  }

  /**
   * Retrieves a project by its domain.
   * @param domain - Project domain
   * @returns Promise<Project>
   */
  public static async getByDomain(domain: string): Promise<Project> {
    return await Project.query().where('domain', domain).firstOrFail()
  }

  /**
   * Retrieves all projects with the number of unique visitors in the last 24 hours.
   * @returns Promise<ProjectWithUniqueVisitorCountLast24Hours[]>
   */
  public static async getAllWithVisitorCount(): Promise<
    Array<ProjectWithUniqueVisitorCountLast24Hours>
  > {
    const projects: Array<Project> = await this.getAll()

    return Promise.all(
      projects.map(async (project: Project): Promise<ProjectWithUniqueVisitorCountLast24Hours> => {
        const visitorIds: Array<number> = await VisitorService.getVisitorIdsByProjectId(project.id)

        const nbUniqueVisitorLast24Hours: number =
          await PageViewService.getNumberUniquePageViewsForVisitorsInLastHours(visitorIds, 24)

        return { project, nbUniqueVisitorLast24Hours }
      })
    )
  }

  /**
   * Creates a project.
   * @param domain - Project domain
   * @returns Promise<Project>
   */
  public static async create(domain: string): Promise<Project> {
    try {
      const favicon: string | null = await DomainService.uploadDomainFavicon(domain)
      const project: Project = await Project.create({ domain, favicon })
      return await Project.findOrFail(project.id)
    } catch (error) {
      console.error('Error retrieving favicon:', error)
      const project: Project = await Project.create({ domain })
      return await Project.findOrFail(project.id)
    }
  }

  /**
   * Updates a project by its ID.
   * @param id - Project ID
   * @param domain - Project domain
   * @returns Promise<Project>
   */
  public static async update(id: number, domain: string): Promise<Project> {
    const project: Project = await Project.findOrFail(id)

    project.domain = domain

    try {
      project.favicon = await DomainService.uploadDomainFavicon(domain)
    } catch (error) {
      project.favicon = null
      console.error('Error retrieving favicon:', error)
    }

    await project.save()

    return project
  }

  /**
   * Deletes a project by its ID.
   * @param id - Project ID
   */
  public static async delete(id: number): Promise<void> {
    const project: Project = await Project.findOrFail(id)
    await project.delete()
  }
}
/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import axios, { AxiosResponse } from "axios";
import { inject, injectable } from "inversify";
import type { AuthorizationParam } from "../../../imodels-client-management/base/interfaces/CommonInterfaces";
import { ProjectsClientConfig } from "./ProjectsClientConfig";

interface Project {
  id: string;
}

interface ProjectsResponse {
  projects: Project[];
}

interface ProjectResponse {
  project: Project;
}

@injectable()
export class ProjectsClient {
  constructor(
    @inject(ProjectsClientConfig)
    private _config: ProjectsClientConfig
  ) { }

  public async getOrCreateProject(params: AuthorizationParam & { projectName: string }): Promise<string> {
    const authorizationInfo = await params.authorization();
    const requestConfig = {
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Authorization: `${authorizationInfo.scheme} ${authorizationInfo.token}`,
      },
    };

    const getProjectsWithNameUrl = `${this._config.baseUrl}?displayName=${params.projectName}`;
    const getProjectsWithNameResponse: AxiosResponse<ProjectsResponse> = await axios.get(getProjectsWithNameUrl, requestConfig);
    if (getProjectsWithNameResponse.data.projects.length > 0) {
      return getProjectsWithNameResponse.data.projects[0].id;
    }

    const createProjectUrl = this._config.baseUrl;
    const createProjectBody = {
      displayName: params.projectName,
      projectNumber: `${params.projectName} ${new Date()}`,
    };
    const createProjectResponse: AxiosResponse<ProjectResponse> = await axios.post(createProjectUrl, createProjectBody, requestConfig);
    return createProjectResponse.data.project.id;
  }
}

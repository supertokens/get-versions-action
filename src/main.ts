import * as core from '@actions/core'

type InputType = {
  driverName: string
  cdiVersion: string
  coreMode: string
  corePlanType: string
  frontendMode: string
  fdiVersion: string
}

function getInputs(): InputType {
  return {
    driverName: core.getInput('driver-name', { required: true }),

    cdiVersion: core.getInput('cdi-version', { required: false }),
    coreMode: core.getInput('core-mode', { required: false }),
    corePlanType: core.getInput('core-plan-type', { required: false }),

    frontendMode: core.getInput('frontend-mode', { required: false }),
    fdiVersion: core.getInput('fdi-version', { required: false })
  }
}

function ErrorFactory(
  params: { [key: string]: string },
  dataDescription: string,
  response: string,
  statusCode: number
) {
  const paramStr = Object.entries(params)
    .map(([key, val]) => `${key}=${val}`)
    .join(', ')

  return new Error(
    `Fetch ${dataDescription} for ${paramStr} yielded: ${response} with statusCode=${statusCode}`
  )
}

async function fetchWithApiKey({
  url,
  params,
  description,
  outputKey
}: {
  url: string
  params: { [key: string]: string }
  description: string
  outputKey: string
}) {
  const apiKey = process.env.SUPERTOKENS_API_KEY as string

  const queryParams = new URLSearchParams({
    password: apiKey,
    ...params
  })

  const response = await fetch(url + queryParams.toString())

  if (!response.ok) {
    throw ErrorFactory(
      params,
      description,
      await response.text(),
      response.status
    )
  }

  const responseData = (await response.json()) as { [key: string]: string }
  const data = responseData[outputKey]

  if (!data) {
    throw ErrorFactory(params, description, data, response.status)
  }

  return data
}

function getFetchDetails(inputs: InputType) {
  return {
    coreVersion: (cdiVersion: string) => ({
      url: 'https://api.supertokens.io/0/core-driver-interface/dependency/core/latest',
      params: {
        planType: inputs.corePlanType,
        mode: inputs.coreMode,
        driverName: inputs.driverName,
        version: cdiVersion
      },
      description: 'core version',
      outputKey: 'core'
    }),
    frontendVersionXY: (fdiVersion: string) => ({
      url: 'https://api.supertokens.io/0/frontend-driver-interface/dependency/frontend/latest',
      params: {
        frontendName: 'website',
        mode: inputs.frontendMode,
        driverName: inputs.driverName,
        version: fdiVersion
      },
      description: 'frontend X.Y version',
      outputKey: 'frontend'
    }),
    frontendTag: (frontendVersionXY: string) => ({
      url: 'https://api.supertokens.io/0/driver/latest',
      params: {
        mode: inputs.frontendMode,
        name: 'website',
        version: frontendVersionXY
      },
      description: 'frontend X.Y.Z version tag',
      outputKey: 'tag'
    }),
    frontendVersion: (frontendVersionXY: string) => ({
      url: 'https://api.supertokens.io/0/driver/latest',
      params: {
        mode: inputs.frontendMode,
        name: 'website',
        version: frontendVersionXY
      },
      description: 'frontend X.Y.Z version',
      outputKey: 'version'
    }),
    nodeVersionXY: (fdiVersion: string) => ({
      url: 'https://api.supertokens.io/0/frontend-driver-interface/dependency/driver/latest',
      params: {
        frontendName: 'auth-react',
        mode: inputs.frontendMode,
        driverName: 'node',
        version: fdiVersion
      },
      description: 'node driver X.Y version',
      outputKey: 'driver'
    }),
    nodeTag: (nodeVersionXY: string) => ({
      url: 'https://api.supertokens.io/0/driver/latest',
      params: {
        mode: inputs.frontendMode,
        name: 'node',
        version: nodeVersionXY
      },
      description: 'node X.Y.Z version tag',
      outputKey: 'tag'
    }),
    authReactVersionXY: (fdiVersion: string) => ({
      url: 'https://api.supertokens.io/0/frontend-driver-interface/dependency/frontend/latest',
      params: {
        frontendName: 'auth-react',
        mode: inputs.frontendMode,
        driverName: inputs.driverName,
        version: fdiVersion
      },
      description: 'auth-react frontend driver X.Y version',
      outputKey: 'frontend'
    }),
    authReactTag: (authReactVersionXY: string) => ({
      url: 'https://api.supertokens.io/0/driver/latest',
      params: {
        mode: inputs.frontendMode,
        name: 'auth-react',
        version: authReactVersionXY
      },
      description: 'auth-react frontend X.Y version tag',
      outputKey: 'tag'
    }),
    authReactVersion: (authReactVersionXY: string) => ({
      url: 'https://api.supertokens.io/0/driver/latest',
      params: {
        mode: inputs.frontendMode,
        name: 'auth-react',
        version: authReactVersionXY
      },
      description: 'auth-react frontend X.Y version',
      outputKey: 'version'
    })
  }
}

export async function run(): Promise<void> {
  const inputs = getInputs()
  const { fdiVersion, cdiVersion } = inputs
  const fetchDetails = getFetchDetails(inputs)

  if (cdiVersion) {
    const coreVersion = await fetchWithApiKey(
      fetchDetails.coreVersion(cdiVersion)
    )
    core.setOutput('core-version', coreVersion)
  }

  if (fdiVersion) {
    const frontendVersionXY = await fetchWithApiKey(
      fetchDetails.frontendVersionXY(fdiVersion)
    )
    core.setOutput('frontend-version-xy', frontendVersionXY)

    const frontendTag = await fetchWithApiKey(
      fetchDetails.frontendTag(frontendVersionXY)
    )
    core.setOutput('frontend-tag', frontendTag)

    const frontendVersion = await fetchWithApiKey(
      fetchDetails.frontendVersion(frontendVersionXY)
    )
    core.setOutput('frontend-version', frontendVersion)

    const nodeVersionXY = await fetchWithApiKey(
      fetchDetails.nodeVersionXY(fdiVersion)
    )
    core.setOutput('node-version-xy', nodeVersionXY)

    const nodeTag = await fetchWithApiKey(fetchDetails.nodeTag(nodeVersionXY))
    core.setOutput('node-tag', nodeTag)

    const authReactVersionXY = await fetchWithApiKey(
      fetchDetails.authReactVersionXY(fdiVersion)
    )
    core.setOutput('auth-react-version-xy', authReactVersionXY)

    const authReactTag = await fetchWithApiKey(
      fetchDetails.authReactTag(authReactVersionXY)
    )
    core.setOutput('auth-react-tag', authReactTag)

    const authReactVersion = await fetchWithApiKey(
      fetchDetails.authReactVersion(authReactVersionXY)
    )
    core.setOutput('auth-react-version', authReactVersion)
  }
}

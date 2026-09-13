param(
    [string]$Subscription = "Abonnement Visual Studio Enterprise",
    [string]$ResourceGroup = "AMVCC-URLShortner",
    [string]$Location = "northeurope",
    [string]$FunctionAppName = "amvcc-urlshort-admin-flex",
    [string]$HostStorageName = "amvccadm2f6b44d8",
    [string]$DataStorageName = "amvccurlshortnerb834",
    [string]$TenantId = "671740f0-0ce9-4b51-bae5-4096de8b66d3",
    [string]$ApiClientId = "99db993a-8192-47b3-a1af-557a9554f98b",
    [string]$SharePointOrigin = "https://amvcc.sharepoint.com",
    [string]$CustomDomain = "https://amvcc.com"
)

$ErrorActionPreference = "Stop"
$previousSubscription = az account show --query id -o tsv
$authFile = [IO.Path]::GetTempFileName()

try {
    az account set --subscription $Subscription

    $storageExists = az storage account show `
        --resource-group $ResourceGroup `
        --name $HostStorageName `
        --query name `
        -o tsv 2>$null

    if (-not $storageExists) {
        az storage account create `
            --resource-group $ResourceGroup `
            --name $HostStorageName `
            --location $Location `
            --sku Standard_LRS `
            --allow-blob-public-access false `
            --min-tls-version TLS1_2 `
            --only-show-errors `
            -o none
    }

    $functionExists = az functionapp show `
        --resource-group $ResourceGroup `
        --name $FunctionAppName `
        --query name `
        -o tsv 2>$null

    if (-not $functionExists) {
        az functionapp create `
            --resource-group $ResourceGroup `
            --name $FunctionAppName `
            --storage-account $HostStorageName `
            --flexconsumption-location $Location `
            --runtime dotnet-isolated `
            --runtime-version 10.0 `
            --instance-memory 2048 `
            --maximum-instance-count 20 `
            --functions-version 4 `
            --only-show-errors `
            -o none
    }

    $identity = az functionapp identity assign `
        --resource-group $ResourceGroup `
        --name $FunctionAppName `
        -o json | ConvertFrom-Json

    $dataStorage = az storage account show `
        --resource-group $ResourceGroup `
        --name $DataStorageName `
        -o json | ConvertFrom-Json

    $tableRole = az role assignment list `
        --assignee-object-id $identity.principalId `
        --scope $dataStorage.id `
        --role "Storage Table Data Contributor" `
        --query "[0].id" `
        -o tsv

    if (-not $tableRole) {
        az role assignment create `
            --assignee-object-id $identity.principalId `
            --assignee-principal-type ServicePrincipal `
            --role "Storage Table Data Contributor" `
            --scope $dataStorage.id `
            --only-show-errors `
            -o none
    }

    az functionapp config appsettings set `
        --resource-group $ResourceGroup `
        --name $FunctionAppName `
        --settings `
            "ConnectionStrings__strTables=$($dataStorage.primaryEndpoints.table)" `
            "CustomDomain=$CustomDomain" `
            "Authorization__AdminRole=UrlAdmin" `
        --only-show-errors `
        -o none

    az functionapp cors add `
        --resource-group $ResourceGroup `
        --name $FunctionAppName `
        --allowed-origins $SharePointOrigin `
        --only-show-errors `
        -o none

    $authSettings = @{
        properties = @{
            platform = @{
                enabled = $true
                runtimeVersion = "~1"
            }
            globalValidation = @{
                requireAuthentication = $true
                unauthenticatedClientAction = "Return401"
            }
            identityProviders = @{
                azureActiveDirectory = @{
                    enabled = $true
                    registration = @{
                        openIdIssuer = "https://login.microsoftonline.com/$TenantId/v2.0"
                        clientId = $ApiClientId
                    }
                    validation = @{
                        allowedAudiences = @($ApiClientId)
                        defaultAuthorizationPolicy = @{
                            allowedApplications = @("08e18876-6177-487e-b8b5-cf950c1e598c")
                        }
                    }
                }
            }
            login = @{
                tokenStore = @{
                    enabled = $false
                }
                preserveUrlFragmentsForLogins = $false
            }
            httpSettings = @{
                requireHttps = $true
            }
        }
    } | ConvertTo-Json -Depth 10 -Compress

    [IO.File]::WriteAllText(
        $authFile,
        $authSettings,
        [Text.UTF8Encoding]::new($false))

    $subscriptionId = az account show --query id -o tsv
    $authUrl = "https://management.azure.com/subscriptions/$subscriptionId/resourceGroups/$ResourceGroup/providers/Microsoft.Web/sites/$FunctionAppName/config/authsettingsV2?api-version=2024-04-01"

    az rest `
        --method PUT `
        --url $authUrl `
        --headers "Content-Type=application/json" `
        --body "@$authFile" `
        --only-show-errors `
        -o none

    Push-Location $PSScriptRoot
    try {
        func azure functionapp publish $FunctionAppName --dotnet-isolated
    }
    finally {
        Pop-Location
    }

    Write-Host "Admin API deployed to https://$FunctionAppName.azurewebsites.net"
}
finally {
    Remove-Item -LiteralPath $authFile -Force -ErrorAction SilentlyContinue
    az account set --subscription $previousSubscription
}

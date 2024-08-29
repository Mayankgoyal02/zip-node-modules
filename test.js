const fs = require('fs');
const shell = require('shelljs');
const axios = require('axios')
const JSZip = require('jszip');
const path = require('path');
require('dotenv/config')

const { exec } = require('child_process');

// Create a new instance of JSZip only for lambda and APi gateway
const zip = new JSZip();


// const awsGenerateName = require('./awsNamingEngine/naming');
// const azureGenerateName = require('./azureNamingEngine/naming');

let entity;
let entityTag;
let applicationDomain;
let platform;
let environmentName;
let region;
let productName
let pathProductName
let ritm_number

async function main() {
    try {

        // read the payload
        // const payloadData = JSON.parse(process.env.PAYLOAD);

        //for local testing
        const payloadData = JSON.parse(fs.readFileSync('./snow_payload.json'));
        const resourceIdFile = JSON.parse(fs.readFileSync('./resourceIdConfig.json'));
        console.log("Payload coming from servicenow: ", JSON.stringify(payloadData))

        platform = payloadData.cloudPlatform;
        entity = payloadData.additional_details.entity;
        entityTag = payloadData.additional_details.entityTag;
        applicationDomain = payloadData.additional_details.applicationDomian
        productName = payloadData.additional_details.product;
        pathProductName = payloadData.additional_details.modifiedProductName;
        environmentName = payloadData.additional_details.environment;
        region = payloadData.region;
        ritm_number = payloadData.ritm_details.number

        // setting the template folder path
        tfTemplateFolder = process.env.TF_TEMPLATE_PATH || `./templates/${platform}`;


        let resources = payloadData.resources

        let tfFilesPath = `Entity/${entity.toUpperCase()}/product/${pathProductName}/${platform}/${environmentName}/${ritm_number}`

        if (!fs.existsSync(`../${tfFilesPath}`)) {
            shell.mkdir('-p', `../${tfFilesPath}`);
        } else {
            shell.rm('-rf', `../${tfFilesPath}/*`);
        }

        for (let i = 0; i < resources.length; i++) {

            // let resource_id = i+1 - ID cahnged
            const idAbb = resourceIdFile[resources[i].resource_type]
            console.log("idabb:", idAbb);
            let resource_id = `${resources[i].id}-${idAbb}`;


            // generate main.tf
            await readAndAppendContents("main", resources[i].resource_type, tfFilesPath, resource_id);

            // generate data.tf
            await readAndAppendContents("data", resources[i].resource_type, tfFilesPath, resource_id);

            // generate outputs.tf
            await readAndAppendContents("outputs", resources[i].resource_type, tfFilesPath, resource_id);

            // generate variables.tf
            await readAndAppendContents("variables", resources[i].resource_type, tfFilesPath, resource_id);

            // generate variables.tf
            await readAndAppendContents("local", resources[i].resource_type, tfFilesPath, resource_id);


        }

        //setting resource variables
        let generatedVariables = [];
        for (let loopvar = 0; loopvar < resources.length; loopvar++) {
            const rsrcType = resources[loopvar].resource_type
            const rsrcVars = getResourceVars(rsrcType) || [];
            const idAbb = resourceIdFile[resources[loopvar].resource_type]
            // const rscPid = loopvar+1 - ID cahnged
            const rscPid = `${resources[loopvar].id}-${idAbb}`
            for (let eachVars of rsrcVars) {
                generatedVariables.push({
                    ...eachVars,
                    key: eachVars.key + rscPid
                });
            }
        }


        fs.writeFileSync(`../${tfFilesPath}/all_vars.json`, JSON.stringify(generatedVariables, null, 4), "utf8");

        shell.cp(`templates/providers/${platform}/provider.tf`, `../${tfFilesPath}`);
        shell.cp(`templates/providers/${platform}/provider_variables.tf`, `../${tfFilesPath}`);

        // generates terraform.tfvars - mapping terraform variables and its values
        // let tfVarsContent = "";
        // for (let eachVars of generatedVariables) {
        //     const generatedVar = eachVars;
        //     let value = "";

        //     //Generate Names
        //     if (generatedVar.action === 'NameEngineLookup') {
        //         let key = generatedVar.key
        //         for(let rs=0;rs<resources.length;rs++){
        //             let resId = rs+1;
        //             let idLength = `${resId}`.length
        //             let keyId = key.slice(-1 * idLength)
        //             if((resId == keyId) && platform == "aws"){
        //                 console.log("aws naming engine called")
        //                 value = await awsGenerateName(generatedVar.resource_name,payloadData,keyId-1)
        //                 break;
        //             }
        //             if((resId == keyId) && platform == "azure"){
        //                 value = await azureGenerateName(generatedVar.resource_name,payloadData,keyId-1)
        //                 console.log("azure naming engine called")
        //                 break;
        //             }
        //         }
        //     }
        //     if (generatedVar.action === 'None') {
        //         let key = generatedVar.key
        //         for (let rs = 0; rs < resources.length; rs++) {
        //             let resourceDetails = resources[rs].details
        //             let pid = rs+1
        //             let resourceIdLength = `${pid}`.length

        //             let resId = key.slice(-1 * resourceIdLength)
        //             let newKey = key.slice(0, key.length - resourceIdLength);

        //             if(resourceDetails[newKey] && resId == pid){
        //                 value = resourceDetails[newKey]
        //                 break;
        //             }
        //             else{
        //                 value = generatedVar.value
        //             }
        //         }
        //     }
        //     if (value[0] !== "[") {
        //         value = `"${value}"`
        //     }
        //     if (!tfVarsContent) {
        //         tfVarsContent = `${generatedVar.key} = ${value}`;
        //     } else {
        //         tfVarsContent = tfVarsContent + "\n" + `${generatedVar.key} = ${value}`;
        //     }
        // }

        let tfVarsContent = {};

        // store resource counts coming from user payload
        let resourceCountList = {}

        for (let eachVars of generatedVariables) {
            const generatedVar = eachVars;
            let value = "";

            //Generate Names
            if (generatedVar.action === 'NameEngineLookup') {
                let key = generatedVar.key

                if (resourceCountList[generatedVar.resource_name]) {
                    resourceCountList[generatedVar.resource_name]++;
                } else {
                    resourceCountList[generatedVar.resource_name] = 1
                }

                for (let rs = 0; rs < resources.length; rs++) {
                    let resId = rs + 1;
                    let idLength = `${resId}`.length
                    let keyId = key.slice(-1 * idLength)
                    if ((resId == keyId) && platform == "aws") {
                        // value = await awsGenerateName(generatedVar.resource_name,payloadData,resourceCountList[generatedVar.resource_name],keyId-1)
                        // console.log(`Name generated for ${generatedVar.resource_name} - ${value}`);
                        break;
                    }
                    if ((resId == keyId) && platform == "azure") {
                        // value = await azureGenerateName(generatedVar.resource_name,payloadData,resourceCountList[generatedVar.resource_name],keyId-1)
                        // console.log(`Name generated for ${generatedVar.resource_name} - ${value}`);
                        break;
                    }
                }
            }
            if (generatedVar.action === 'None') {
                let key = generatedVar.key
                for (let rs = 0; rs < resources.length; rs++) {
                    let resourceDetails = resources[rs].details
                    // let pid = rs+1 - ID change
                    const idAbb = resourceIdFile[resources[rs].resource_type]
                    let pid = `${resources[rs].id}-${idAbb}`
                    console.log(pid)
                    let resourceIdLength = `${pid}`.length
                    console.log(resourceIdLength)
                    let resId = key.slice(-1 * resourceIdLength)
                    console.log(resId)
                    let newKey = key.slice(0, key.length - resourceIdLength);
                    console.log(newKey)
                    if (resourceDetails[newKey] && resId == pid) {
                        value = resourceDetails[newKey]
                        break;
                    }
                    else {
                        value = generatedVar.value
                    }
                }
            }

            tfVarsContent[generatedVar.key] = value;
        }

        const subscriptionId = payloadData.subscriptionId
        tfVarsContent["subscription_id"] = subscriptionId

        if (platform === "aws") {
            tfVarsContent["region"] = region
        }

        const AzurelocationAbb = {
            "eastus2": "USE2",
            "centralus": "USC",
            "northeurope": "EUN",
            "westeurope": "EUW"
        }

        let common_tags = {
            "Entity": entityTag.toUpperCase(),
            "AppDomain": applicationDomain,
            "AppDomainOwner": payloadData.additional_details.DomainOwner,
            "Environment": environmentName,
            "CreatedBy": payloadData.additional_details.requestedFor,
            "ProductOrFunction": productName,
            "LocationOrRegion": AzurelocationAbb[region],
            "Source": "Terraform",
            "HostingProvider": platform,
            "CodeFolder": tfFilesPath
        }

        for (let i = 0; i < resources.length; i++) {
            // let resourceTagId = i+1 - ID Changed
            const idAbb = resourceIdFile[resources[i].resource_type]
            let resourceTagId = `${resources[i].id}-${idAbb}`
            let additional_tags = {}
            let tags = {}
            if (resources[i].resource_type === "virtualmachinelinux" || resources[i].resource_type === "virtualmachinewindows") {

                additional_tags = {
                    "ADDomain": payloadData.resources[i].details.ad_domain,
                    "PatchGroup": payloadData.resources[i].details.patch_group,
                    "SupportContact": payloadData.resources[i].details.support_contact,
                    "Backup": payloadData.resources[i].details.backup
                }
            }

            //merging common tags and additional resource specific tags
            tags = {
                ...common_tags,
                ...additional_tags
            }

            tfVarsContent[`tags${resourceTagId}`] = tags
            fs.writeFileSync(`../${tfFilesPath}/terraform.tfvars.json`, JSON.stringify(tfVarsContent), 'utf8');
        }

        console.log(tfVarsContent)


        const backendTemp = fs.readFileSync(`../Entity/${entity.toUpperCase()}/${platform}_backend.tf`, "utf8")
        const backendData = backendTemp.replace(/key = "somepath"/g, `key = "${entity.toUpperCase()}/product/${pathProductName}/${platform}/${environmentName}/${ritm_number}/terraform.tfstate"`)
        fs.writeFileSync(`../${tfFilesPath}/backend.tf`, backendData, "utf8")

        for (let i = 0; i < resources.length; i++) {
            const idAbb = resourceIdFile[resources[i].resource_type]
            let resourceId = `${resources[i].id}-${idAbb}`

            if (resources[i].resource_type == "kms") {
                const kmsProviderFile = fs.readFileSync(`templates/providers/${platform}/kms_provider.tf`, "utf8");
                const kmsProviderVars = fs.readFileSync(`templates/providers/${platform}/kms_provider_vars.tf`, "utf8")

                let kmsProviderData = kmsProviderFile.replace(/\$loopvar/g, resourceId)
                let kmsProviderVarsData = kmsProviderVars.replace(/\$loopvar/g, resourceId)

                fs.appendFileSync(`../${tfFilesPath}/provider.tf`, `\n${kmsProviderData}`, "utf8")
                fs.appendFileSync(`../${tfFilesPath}/provider_variables.tf`, `\n${kmsProviderVarsData}`, "utf8")

            }


            //Config for Lambda to copy nodejs and python file from another source
            if (resources[i].resource_type == "lambda") {
                const githubToken = `${process.env.GITHUB_ACCESS_TOKEN}`
                const owner = payloadData.resources[i].details.repository_owner
                const sourceRepo = payloadData.resources[i].details.repository_name
                const directoryName = payloadData.resources[i].details.directoryName
                // const files = payloadData.resources[i].details.files
                const sourceBranch = payloadData.resources[i].details.repository_branch
                const ritmNumber = ritm_number
                // const runTime = payloadData.resources[i].details.runtime
                // const folderPath = `../Terraform-Modules/aws/LAMBDA/${directoryName}_${ritmNumber}`
                // const zipFolder = "../Terraform-Modules/aws/LAMBDA"


                const githubApi = axios.create({
                    baseURL: "https://api.github.com",
                    headers: {
                        Authorization: `token ${githubToken}`,
                        Accept: "application/vnd.github.v3+json"
                    }
                })

                await copyFiles(owner, sourceRepo, sourceBranch, directoryName, githubApi, ritmNumber)

                // addFolderToZip(folderPath, zip)

                // Generate the zip file and save it to disk
                // zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
                //     .pipe(fs.createWriteStream(path.join(zipFolder, `${directoryName}_${ritmNumber}.zip`)))
                //     .on('finish', function () {
                //         console.log('Zip file created successfully.');
                //     })
                //     .on('error', function (err) {
                //         console.error(`Error creating zip file: ${err.message}`);
                //     });

                // shell.rm('-rf',folderPath);
            }
        }

    } catch (error) {
        throw new Error(`Error in main: ${error.message}`);
    }
}

async function readAndAppendContents(typeOfFile, resourceType, tfFilesPath, resourceId) {
    try {
        const templateFileData = fs.readFileSync(`${tfTemplateFolder}/${resourceType}/${resourceType}_${typeOfFile}.tf`, "utf8");

        let formattedFileData = templateFileData.replace(/\$loopvar/g, resourceId)

        if (fs.existsSync(`../${tfFilesPath}/${resourceType}_${typeOfFile}${resourceId}.tf`)) {
            // const fileData = fs.readFileSync(`./${tfFilesPath}/${resourceType}_${typeOfFile}.tf`, "utf8");
            const updatedFileData = formattedFileData;
            fs.writeFileSync(`../${tfFilesPath}/${resourceType}_${typeOfFile}${resourceId}.tf`, updatedFileData, "utf8");
        } else {
            fs.writeFileSync(`../${tfFilesPath}/${resourceType}_${typeOfFile}${resourceId}.tf`, formattedFileData, "utf8");
        }

    } catch (error) {
        throw new Error(`Error in readAndAppendContents: ${error.message}`);
    }
}

function getResourceVars(resourceType) {
    try {
        const resourceConfigData = JSON.parse(fs.readFileSync(`${tfTemplateFolder}/${resourceType}/${resourceType}_config.json`));
        return resourceConfigData.parameters;
    } catch (error) {
        throw new Error(`Error in getResourceVars: ${error.message}`);
    }
}

const getFilesInDirectory = async (githubApi, owner, sourceRepo, sourceBranch, directoryName) => {
    try {
        const response = await githubApi.get(`/repos/${owner}/${sourceRepo}/contents/${directoryName}`, { params: { ref: sourceBranch } })
        return response.data;

    } catch (err) {
        throw new Error(`Error in fetching directory Contents ${err}`)
    }
}

const copyFiles = async (owner, sourceRepo, sourceBranch, directoryName, githubApi, ritmNumber) => {
    try {
        const files = await getFilesInDirectory(githubApi, owner, sourceRepo, sourceBranch, directoryName);

        if (!fs.existsSync(`../Terraform-Modules/aws/LAMBDA/${directoryName}_${ritmNumber}`)) {
            shell.mkdir('-p', `../Terraform-Modules/aws/LAMBDA/${directoryName}_${ritmNumber}`);
        } else {
            shell.rm('-rf', `../Terraform-Modules/aws/LAMBDA/${directoryName}_${ritmNumber}/*`);
        }
        for (const file of files) {
            if (file.type === "file") {
                const fileResponse = await githubApi.get(`/repos/${owner}/${sourceRepo}/contents/${file.path}`, { params: { ref: sourceBranch } })
                const fileContent = Buffer.from(fileResponse.data.content, 'base64').toString('utf-8')

                console.log(file.name)

                fs.writeFileSync(`../Terraform-Modules/aws/LAMBDA/${directoryName}_${ritmNumber}/${file.name}`, fileContent, (err) => {
                    if (err) {
                        throw new Error(`Error in creating directory with codes`)
                    } else {
                        console.log(`Directory codebase Created Successfully`)
                    }
                })
            }
        }

        // if (fs.existsSync(`../Terraform-Modules/aws/LAMBDA/${directoryName}_${ritmNumber}/requirements.txt`)) {
        //     const requirementsFilePath = `requirements.txt`
        //     const command = `pip install -r ${requirementsFilePath} -t ./`
        //     process.chdir(`../Terraform-Modules/aws/LAMBDA/${directoryName}_${ritmNumber}`)
        //     exec(command, (error, stdout, stderr) => {
        //         if (error) {
        //             throw new Error(`Error installing Python dependencies: ${error}`)
        //             return;
        //         }
        //         if (stderr) {
        //             throw new Error(`stderr: ${stderr}`)
        //             return
        //         }
        //         console.log(`stdout: ${stdout}`)
        //     })

        // } else {
        //     console.log("Requirements.txt file is not Present")
        // }

        // if (fs.existsSync(`../Terraform-Modules/aws/LAMBDA/${directoryName}_${ritmNumber}/package.json`)) {
        //     const command = `npm install`
        //     process.chdir(`../Terraform-Modules/aws/LAMBDA/${directoryName}_${ritmNumber}`)
        //     exec(command, (error, stdout, stderr) => {
        //         if (error) {
        //             throw new Error(`Error installing Nodejs dependencies: ${error}`)
        //             return;
        //         }
        //         if (stderr) {
        //             throw new Error(`stderr: ${stderr}`)
        //             return
        //         }
        //         console.log(`stdout: ${stdout}`)
        //     })
        // } else {
        //     console.log("Package.json file is not present")
        // }

    } catch (err) {
        throw new Error(`Error in copy files from Developer's source repo: ${err}`)
    }
}


// Function to add files and directories to the zip archive
// function addFolderToZip(folderPath, zipFunction) {
//     try {
//         const files = fs.readdirSync(folderPath);
//         files.forEach(file => {
//             const filePath = path.join(folderPath, file);
//             const stat = fs.statSync(filePath);
//             if (stat.isDirectory()) {
//                 // Recursively add subdirectories
//                 const newZipFolder = zipFunction.folder(file);
//                 addFolderToZip(filePath, newZipFolder);
//             } else {
//                 // Add files to the zip
//                 zipFunction.file(file, fs.readFileSync(filePath));
//             }
//         });
//     } catch (err) {
//         console.error(`Error processing directory ${folderPath}: ${err.message}`);
//     }
// }

main()

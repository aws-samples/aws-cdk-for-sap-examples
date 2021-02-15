# CDK TypeScript project for SAP Data Intelligence

Deployment of SAP Data Intelligence using AWS CDK. 
For more information see [SAP on AWS blog](https://aws.amazon.com/blogs/awsforsap/voice-of-customer-analytics-using-sap-data-intelligence-on-aws)

## Architecture of the deployment
1. AWS CDK will create new VPC (CIDR 10.20.0.0/16) with two private and public subnets (sapdi-priate and sapdi-public). If you want to use different CIDR please modify the cdk-vpc stack accordingly. If you want use existing VPC please follow section "Deployment in existing VPC)
2. AWS CDK will install Amazon EKS cluster with two m5.2xlarge worker nodes and 50 GB storage for each.
3. After Amazon EKS Kubernetes cluster deployment, we will create Kubernetes POD called install-sapdi which will will download installation script and run the shell script to deploy SAP DataIntelligence in unattended mode

### SAP DataIntelligence installation script
Script name:`deploy-sapdi.sh`

The bash script consists of following function modules

1. In `initlog` we initialize internal log for further troubleshooting and debug.
2. In `load_config` we load the custom configuration from the deploy-sapdi.config file
3. In `copy_files_from_s3` function we copy following files from the S3 bucket location

 * cdk-eks-config.json
 * cluster-role-sa.yaml
 * deploy-sapdi.config
 * nginx-ingress.yaml
 * service-l4.yaml
 * slcb-init.yaml
 * slcb-param.yaml
 * deploy-sapdi.sh 
 * MP\_Stack_xxxxxxxxxx\_xxxxxxxx\_.xml
 * slcb

4. In `install_update_kube_config` we install kubectl tool and update the kubeconfig to be able to work with the cluster nodes. We also update the service account with kubernetes cluster roles to allow deployment of the SAP DataIntelligence.
5. In `initialize_images` we run `slcb init` to initialize the SLC Bridge pod in Kubernetes
6. In `install_sapdi` we run full platform SAP DI installation
7. In `deploy_elb_ingress` we run install internal AWS ELB for Kubernetes (NGINX) and configure backend to vsystem on port 8798
8. In `copy_logs_to_s3` we copy all logs back to S3 for further analyse


## Prerequisites
- SAP S-user with authorization to download software from SAP Marketplace
- AWS CDK deployed on local machine, or any Linux EC2 instance
- VPC access to Internet to download the SAP Data Intelligence packages
- IAM user with required permissions

## Configuration
1. Use SAP Maintenance Planner and generate the Stack XML file for SAP Data Intelligence installation. You can find full guidance here https://blogs.sap.com/2020/04/13/how-to-install-sap-data-intelligence-3.0-on-premise-edition/ and copy it to S3 bucket
2. Download the SLC bridge tool for Linux OS from following link https://launchpad.support.sap.com/#/softwarecenter/search/SLCB and upload it to S3 bucket
3. Download github files from <ADD GIT REPO>
4. Adjust the configuration files for SAP Data Intelligence unattended installation 
 
  
 ##### deploy-sapdi.config
  
 |Parameter name|Description|
 |--------------|-----------|
 |*S3\_BUCKET\_NAME*| S3 bucket where all config files are uploaded|
 |*STACKFILE*     | SAP DI Stack XML file generated with SAP Maintenance Planner|
 |*SAPDIHOSTNAME* | Hostname for SAP DI as alias to internal ELB address|
 |*AWSACCOUNTID*|AWS account ID|
 
 
 ##### slcb-init.yaml
  
 |Parameter name|Description|
 |--------------|-----------|
 |*ADMIN\_PASSWORD* | Password for SLCB images, must contain capital and small letters, number and special character (e.g.  _ )|
 |*SLP\_BRIDGE\_REPOSITORY*|Repository for SLP (e.g. "\<AWS-account-ID>.dkr.ecr.\<AWS-Region>.amazonaws.com/sap-di3-v75)"|
 |*IMAGES\_SAP\_SUSER* |          S-user with download permission for the SAP DI images download|
 |*IMAGES_SAP_SUSER_PASSWORD*  |S-user password|
 
 
 ##### slcb-param.yaml
  
 |Parameter name|Description|
 |--------------|-----------|
 |*ADMIN\_PASSWORD* | Password for SLCB images, must contain capital and small letters, number and special character (e.g. _ )|
 |*SLP\_BRIDGE\_REPOSITORY*|Repository for SLP (e.g. "\<AWS-account-ID>.dkr.ecr.\<AWS-Region>.amazonaws.com/sap-di3-v75)"|
 |*IMAGES\_SAP\_SUSER* |          S-user with download permission for the SAP DI images download|
 |*IMAGES_SAP_SUSER_PASSWORD*  |S-user password|
 
  
 ##### cdk-eks-config.json
  
 |Parameter name|Description|
 |--------------|-----------|
 |*SLP_DOCKER_REGISTRY* |        Repository for SLP (e.g. "<AWS-account-ID>.dkr.ecr.<AWS-Region>.amazonaws.com/sap-di3-v75", has to match with same value as in slcb-init.yaml file|
 |*SYSTEM_ADMIN_PASSWORD*  |     Has to match with ADMIN_PASSWORD value in slcb-init.yaml file|
 |*DEFAULT_ADMIN_PASSWORD* |     SAP Data Intelligence Initial Tenant Administrator Password, must contain capital and small letters, number and special character (e.g. _ )|
 |*SLP_BRIDGE_REPOSITORY*   |    Repository for SLP (e.g. "\<AWS-account-ID>.dkr.ecr.\<AWS-Region>.amazonaws.com/sap-di3-v75)"|
 |*IMAGES_SAP_SUSER*     |      S-user with download permission for the SAP DI images download|
 |*IMAGES_SAP_SUSER_PASSWORD* | S-user password|
 
 
 ##### cdk-eks-config.json
 
 |Parameter name|Description|
 |--------------|-----------|
 |*sshKeyName*               |   SSH key for the EKS nodes access matching with key in AWS console, has to match region where Amazon EKS will be deployed|
 |*s3Bucket*| S3 bucket with the configuration and execution files|
 
5. Copy following files to single S3 bucket location

 *From the configs subdirectory*

 * cdk-eks-config.json
 * cluster-role-sa.yaml
 * deploy-sapdi.config
 * nginx-ingress.yaml
 * service-l4.yaml
 * slcb-init.yaml
 * slcb-param.yaml

 *From scripts subdirectory*

 * deploy-sapdi.sh  

 *From SAP Maintenance Planner*

 * MP\_Stack_xxxxxxxxxx\_xxxxxxxx\_.xml

 *From SAP Marketplace*

 * slcb


##Execution

1. Export OS enviroments for REGION and account keys

 `export AWS_ACCESS_KEY_ID=""`

 `export AWS_SECRET_ACCESS_KEY=""`

 `export AWS_SESSION_TOKEN=""`

 `export AWS_DEFAULT_REGION=""`

2. Initialize and install CDK packages
 
 The cdk.json file tells the CDK Toolkit how to execute the application.

 `npm -g install typescript npm i @aws-cdk/core @aws-cdk/aws-ec2 @aws-cdk/aws-iam @aws-cdk/aws-eks`

 `cdk synth`
  
3. Run the cdk deploy to deploy the stack

 `cdk deploy cdk-vpc cdk-eks`

4. Insert `SAPDIHOSTNAME` to your local hosts file on Windows jump server pointing to internal AWS Kubernetes ELB IP address and DNS record


**Useful CDK commands**


|Command|Description|
|--------------|-----------| 
|`npm run build` |compile typescript to js|
|`npm run watch`| watch for changes and compile|
|`npm run test`| perform the jest unit tests|
|`cdk deploy` |deploy this stack to your default AWS account/region|
|`cdk diff` |compare deployed stack with current state|
|`cdk synth` |emits the synthesized CloudFormation template|


**Usefull commands to check Kubernetes**


|Command|Description|
|--------------|-----------| 
|`kubectl get pods --all-namespaces`|List pods in all namespaces|
|`kubectl -n default logs install-sapdi`|List logs for the SAP DI installation pod|
|`kubectl get nodes -o wide`|List nodes in ps output format with more information|
|`kubectl get pv`|List all persistent volumes|
|`kubectl get pods --all-namespaces -o wide`|List pods in ps output format with more information|
|`kubectl get services --all-namespaces -o wide`|List services and IP/hostname of load balancer|
|`kubectl describe ingress vsystem`|List ingress configuration for loadbalancer|
|`kubectl get events --sort-by=.metadata.creationTimestamp -n ingress-nginx`| Get system events for ingress-nginx namespace|

# Additional documentation
1. [Install SAP Data Intelligence with SLC Bridge in a Cluster with Internet Access](https://help.sap.com/viewer/a8d90a56d61a49718ebcb5f65014bbe7/3.0.latest/en-US/7e4847e241c340b3a3c50a5db11b46e2.html)
2. [BLOG How to install SAP Data Intelligence 3.0 on-premise edition](https://blogs.sap.com/2020/04/13/how-to-install-sap-data-intelligence-3.0-on-premise-edition/)
3. [Install SAP Data Intelligence with SLC Bridge in Unattended Mode](https://help.sap.com/viewer/a8d90a56d61a49718ebcb5f65014bbe7/3.0.latest/en-US/40d59a4d9c4c4a1ab064ee93496547de.html)
4. [Expose SAP Data Intelligence System Management Externally On-Premise](https://help.sap.com/viewer/a8d90a56d61a49718ebcb5f65014bbe7/3.0.latest/en-US/cdc6e33e338d497e99f594568da986b5.html)
5. [Log On to SAP Data Intelligence Launchpad](https://help.sap.com/viewer/a8d90a56d61a49718ebcb5f65014bbe7/3.0.latest/en-US/8e12370aa28943bdb0952ad9431d2c2c.html)


# License
This library is licensed under the MIT-0 License. See the LICENSE file.

# Additional application server installation using AWS CDK (SAP Netweaver 7.5 on Oracle Database)

This is an example of how to use **AWS Cloud Development Kit (AWS CDK)** to automatically add an additional application. This assumed that you have already deployed an existing [SAP NetWeaver 7.5 for ABAP on the AWS using Oracle Database 19 using AWS CDK](https://github.com/aws-samples/aws-cdk-for-sap-examples/tree/main/sap-netweaver75-on-oracle). The operating system is based on Oracle Linux 8.  

This deploys an SAP standard installation only within a virtual private cloud (VPC) in your AWS account. 

## SAP Standard Installation Stack

### Update appConfig.json
Update the appCongig.json in the lib folder. The information required here is the AWS account ID, region, VPC, Subnet and the SSH Key, primary application server (PAS) hostname, PAS IP address and the EFS. 

### Update bootstrap.sh 
This is where you need to put in the S3 folder created in step 1 with all the binaries. In addition, you can customise the deployment such as the Oracle SID and hostname of the server. By default, this is set to OR1. If this is your first automated deployment, please use the default SID of DEV for SAP, and OR1 for Oracle. Once this is successful, then you can customise it further. 

This deployment is based on the unattended mode of the SAP Software Provisioning Manager. This means that, after inserting the required parameters into a parameter-file and providing the file to SAPinst executable. Please refer to [SAP Note 2230669](https://launchpad.support.sap.com/#/notes/2230669) for further information. 

### Update inifile.params (Optional)
By default, the SAP SID is set to DEV and the password is nimda1234 and the ORA SID is OR1. You can search for these in the inifile and customise it based on your need. 

### Start the deployment
If these are set up correctly, you should be able to deploy the complete SAP system by simply running the cdk deploy command. 


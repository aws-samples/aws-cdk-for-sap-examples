/* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
# Permission is hereby granted, free of charge, to any person obtaining a copy of this
# software and associated documentation files (the "Software"), to deal in the Software
# without restriction, including without limitation the rights to use, copy, modify,
# merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
# permit persons to whom the Software is furnished to do so.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
# INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
# PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
# HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
# OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
# SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
#
==================================================================================== */
import * as core from "@aws-cdk/core";
import * as iam from '@aws-cdk/aws-iam';
import * as ec2 from "@aws-cdk/aws-ec2";
import * as eks from "@aws-cdk/aws-eks";
import { PhysicalName } from '@aws-cdk/core';
import { ManagedPolicy } from "@aws-cdk/aws-iam";

interface MultiStackProps extends core.StackProps {
  vpc: ec2.Vpc;
}

export class CdkEksStack extends core.Stack {

  cluster:eks.Cluster;

  constructor(scope: core.App, id: string, props: MultiStackProps) {

    const eksConfig = require('../configs/cdk-eks-config.json');
    const vpc = props.vpc;
    
    super(scope, id, props);

    const clusterAdmin = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal(),
      roleName: 'cdk-eks-clusterNodeAdminRole-sapdi3'
      });

    //Create EKS cluster
    this.cluster = new eks.Cluster(this, "sap-di3-v75-cluster", {
      clusterName: `sap-di3-v75`,
      mastersRole: clusterAdmin,
      vpc: vpc,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE }],
      defaultCapacity: 0,
      version: eks.KubernetesVersion.V1_16,
      //endpointAccess: eks.EndpointAccess.PRIVATE,
      outputMastersRoleArn: true,
      outputClusterName: true,
    });

    //Add node group role as the default one is missing the container registry access required for SAPDI installation
    const NodeGroupRole = new iam.Role(this, 'NodeAdminRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      roleName: 'cdk-eks-NodeGroupRole-sapdi3'
      });
    NodeGroupRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryFullAccess'));
    NodeGroupRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'));
    NodeGroupRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSWorkerNodePolicy'));
    NodeGroupRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonEKS_CNI_Policy'));
    NodeGroupRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('IAMReadOnlyAccess'));

    this.cluster.addNodegroupCapacity("di3-workers", {
      instanceTypes: [ new ec2.InstanceType('m5.2xlarge') ],
      minSize: 2,
      maxSize: 4,
      diskSize: 50,
      nodeRole: NodeGroupRole,
      subnets: { subnetType: ec2.SubnetType.PRIVATE },
      //remote access for troublesho0ting the 
      remoteAccess: {
        sshKeyName: eksConfig.sshKey,
//        sourceSecurityGroups: [publicSG]
  /*The security groups that are allowed SSH access (port 22) to the worker nodes.

    If you specify an Amazon EC2 SSH key but do not specify a source security group when you create a managed node group, then port 22 on the worker nodes is opened to the internet (0.0.0.0/0).
*/
    }
    });
       // Add service account with managed policy for SAP DI deployment of the POD.
      const sa = this.cluster.addServiceAccount('cdk-sapdi-sa', {
        name: "cdk-sapdi-sa",
      });
      
      sa.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
      
      sa.addToPolicy(new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: ["'arn:aws:iam::"+this.account+":role/cdk-eks-clusterNodeAdminRole-sapdi3'"],
      }));
      sa.addToPolicy(new iam.PolicyStatement({
        actions: [
          's3:*',
          'ec2:*',
          'ecr:*',
          'eks:*',
          'events:*',
          'logs:*'
        ],
        resources: ['*'],
      }));

       // Create Amazon Linux Box for SAP DI installation bash script which will be downloaded from the S3
      this.cluster.addManifest('install-sapdi', {
         apiVersion: 'v1',
         kind: 'Pod',
         metadata: { name: 'install-sapdi'},
         spec: {
           serviceAccountName: sa.serviceAccountName,
           restartPolicy: 'OnFailure',
           containers: [
             {
               name: 'install-sapdi',
               image: 'amazonlinux',
               command: ["/bin/bash", "-c"],
               args: [ "yum install -y aws-cli &&  aws s3 cp s3://"+eksConfig.s3Bucket+"/ /tmp --recursive --exclude \"*\" --include \"deploy-sapdi.*\" && chmod +x /tmp/deploy-sapdi.sh && /tmp/deploy-sapdi.sh "],
             }
           ]
         }
       });
  }
}
function createDeployRole(scope: core.Construct, id: string, cluster: eks.Cluster): iam.Role {
  const role = new iam.Role(scope, id, {
    roleName: PhysicalName.GENERATE_IF_NEEDED,
    assumedBy: new iam.AccountRootPrincipal()
  });
  cluster.awsAuth.addMastersRole(role);

  return role;
}
export interface EksProps extends core.StackProps {
  cluster: eks.Cluster
}



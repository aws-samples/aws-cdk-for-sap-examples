import * as core from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as eks from "@aws-cdk/aws-eks";
import * as rds from "@aws-cdk/aws-rds";

interface MultiStackProps extends core.StackProps {
  vpc: ec2.Vpc;
  rdsCluster:rds.ServerlessCluster;
}

export class CdkEksStack extends core.Stack {

  cluster:eks.Cluster;

  constructor(scope: core.App, id: string, props: MultiStackProps) {

//    const rdsEndpoint = props.rdsEndpoint;
    const repoAcc = process.env.CDK_DEFAULT_ACCOUNT;
    const repoRegion = process.env.CDK_DEFAULT_REGION 
    const repoName = 'sap-commerce-repo'
    const vpc = props.vpc;
    const image_url = repoAcc+'.dkr.ecr.'+repoRegion+'.amazonaws.com/'+repoName+':latest'

    super(scope, id, props);

    //Create EKS cluster
    this.cluster = new eks.Cluster(this, "Cluster", {
      vpc: vpc,
      defaultCapacity: 0,
      version: eks.KubernetesVersion.V1_17,
      outputMastersRoleArn: true,
      outputClusterName: true,
    });

    //Add node group 
    this.cluster.addNodegroupCapacity("nodegroup", {
      instanceType: new ec2.InstanceType("c5.2xlarge"),
      minSize: 2,
      maxSize: 8,
      subnets: { subnetType: ec2.SubnetType.PRIVATE },
    });

    // Deploy SAP Commerce image 
    const appLabel = { app: "sap-commerce" };
    
    this.cluster.addManifest('sap-commerce', {
      apiVersion: "apps/v1",
      kind: "Deployment",
      metadata: { name: "sap-commerce" },
      spec: {
        replicas: 1,
        selector: { matchLabels: appLabel },
        template: {
          metadata: { labels: appLabel },
          spec: {
            containers: [
              {
                name: "sap-commerce",
                image: image_url,
                ports: [ { containerPort: 8088 } ],
                env:
                [ { name: "RDS_ENDPOINT", 
                    value: props.rdsCluster.clusterEndpoint.hostname } ]
              }
            ]
          }
        }
      }
    });   

    this.cluster.addManifest('sap-commerce-lb', {
      apiVersion: "v1",
      kind: "Service",
      metadata: { name: "sap-commerce" },
      spec: {
        type: "LoadBalancer",
        ports: [ { port: 8088, targetPort: 8088 } ],
        selector: appLabel
      }
    });

    const eks_loadbalancer = new core.CfnOutput(this, 'eks-loadbalancer', { value: (this.cluster.getServiceLoadBalancerAddress('sap-commerce'))});

  }
}

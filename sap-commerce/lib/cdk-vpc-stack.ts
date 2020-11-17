import * as core from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";

export class CdkVpcStack extends core.Stack {

  vpc:ec2.Vpc;

  constructor(scope: core.App, id: string, props?: core.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, "VPC", {
      maxAzs: 3,
      cidr:"10.20.0.0/16",
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'commerce-public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'commerce-private',
          subnetType: ec2.SubnetType.PRIVATE,
        },
        {
          cidrMask: 24,
          name: 'commerce-database',
          subnetType: ec2.SubnetType.ISOLATED,
        }
      ],
      natGateways: 2,

    });


  }
}


             
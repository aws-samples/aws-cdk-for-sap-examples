import * as core from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as rds from "@aws-cdk/aws-rds";

interface MultiStackProps extends core.StackProps {
  vpc: ec2.Vpc;
}

export class CdkRdsStack extends core.Stack {

  rdsCluster:rds.ServerlessCluster;

  constructor(scope: core.App, id: string, props: MultiStackProps) {
    super(scope, id, props);

    // Create a security group that allows tcp @ port 3306
    const sg = new ec2.SecurityGroup(this, 'sap-commerce-db-sg', { vpc: props.vpc });
    sg.addIngressRule(ec2.Peer.ipv4('10.20.0.0/16'), ec2.Port.tcp(3306));

    this.rdsCluster = new rds.ServerlessCluster(this, "sap-commerce-db", {
        engine: rds.DatabaseClusterEngine.auroraMysql({ version: rds.AuroraMysqlEngineVersion.VER_5_7_12 }),
        defaultDatabaseName: "aurora",
        credentials: {
          username: 'admin',
          password: core.SecretValue.plainText('nimda1234'),
        },
        vpc: props.vpc,
        securityGroups: [sg],
        vpcSubnets: {
          subnetType: ec2.SubnetType.ISOLATED
      }
    });

    const auroradb_endpoint = new core.CfnOutput(this, 'cluster endpoint', { value: (this.rdsCluster.clusterEndpoint.hostname)});

  }
}


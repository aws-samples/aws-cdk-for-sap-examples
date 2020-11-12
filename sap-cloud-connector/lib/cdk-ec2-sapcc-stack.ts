import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import * as s3 from '@aws-cdk/aws-s3';
import { BlockDeviceVolume, EbsDeviceVolumeType } from '@aws-cdk/aws-ec2';
import { PolicyStatement } from '@aws-cdk/aws-iam';
import { App } from '@aws-cdk/core';

export class CdkSapccStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const AppConfig = require('./appConfig.json');
    const vpc = ec2.Vpc.fromLookup(this, 'vpc', { vpcId: AppConfig.vpcid }, );
    //SUSE Linux 15 SP2 AMI
    const amiLinux = new ec2.GenericLinuxImage({ 
      'us-east-1' : 'ami-0a782e324655d1cc0', 
      'us-east-2' : 'ami-03f4c416f489586a3', 
      'us-west-1' : 'ami-0ac3dbf3917611d92', 
      'us-west-2' : 'ami-0ac3dbf3917611d92', 
      'eu-west-1' : 'ami-051cbea0e7660063d',
      'eu-central-1': 'ami-0ed0be684d3f014bf'
    });

    //Create security group
    const sg = new ec2.SecurityGroup(this, 'sap-cloud-connector-sg', { vpc });
    sg.addIngressRule(ec2.Peer.ipv4(AppConfig.vpccidr), ec2.Port.allTraffic());

    //Bucket to store script
    const s3bucket = new s3.Bucket(this, 'sap-cc-bootstrap', {
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    const s3Asset = new s3deploy.BucketDeployment(this, 's3-scripts-bucket', {
      sources: [s3deploy.Source.asset('./scripts') ],
      destinationBucket: s3bucket,
      retainOnDelete: false,
    });

    const ec2Instance = new ec2.Instance(this, 'sapcc', {
      vpc,
      vpcSubnets: {
        subnetGroupName: AppConfig.subnetName,
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.LARGE),
      machineImage: amiLinux,
      securityGroup: sg,
      userDataCausesReplacement: true,
      blockDevices: [{
        deviceName: '/dev/xvda',
        volume: BlockDeviceVolume.ebs(100, {
          deleteOnTermination: true,
          encrypted: true,
          volumeType: EbsDeviceVolumeType.GP2,
        }),
      }],
      },
    );

    ec2Instance.addToRolePolicy(new PolicyStatement({
      actions: [
        'ssm:*',
        's3:*',
        'ssmmessages:*',
        'ssm:UpdateInstanceInformation',
        'ec2messages:*',
      ],
      resources: ['*'],
    }));

    const command1 = "aws s3 cp s3://" + scriptLocation.value + "/bootstrap.sh /root/install/";   
    const command2 = "aws s3 cp s3://" + scriptLocation.value + "/default-server.xml /root/install/";  

    ec2Instance.addUserData('mkdir -p /root/install');
    ec2Instance.addUserData(command1);
    ec2Instance.addUserData(command2);
    ec2Instance.addUserData('chmod +x /root/install/bootstrap.sh');
    ec2Instance.addUserData('/root/install/bootstrap.sh > /root/install/bootstrap.log');

    const InstanceIP = new cdk.CfnOutput(this, 'sapcc-url', { value: (ec2Instance.instancePrivateIp)});

  }
}

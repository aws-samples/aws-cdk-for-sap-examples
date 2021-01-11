import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as efs from '@aws-cdk/aws-efs';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import * as s3 from '@aws-cdk/aws-s3';
import { BlockDeviceVolume, EbsDeviceVolumeType, Vpc } from '@aws-cdk/aws-ec2';
import { PolicyStatement } from '@aws-cdk/aws-iam';

interface MultiStackProps extends cdk.StackProps {
}

export class SapOracleInstallStack extends cdk.Stack {

  sg: ec2.SecurityGroup;
  s3bucket: s3.Bucket;
  ec2Instance: ec2.Instance;
  scriptLocation: cdk.CfnOutput;
  fileSystem: efs.FileSystem;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const repoAcc = process.env.CDK_DEFAULT_ACCOUNT;
    const repoRegion = process.env.CDK_DEFAULT_REGION 
    const AppConfig = require('./appConfig.json');
    const vpc = ec2.Vpc.fromLookup(this, 'vpc', { vpcId: AppConfig.vpcid }, );
    //Oracle Linux by Oracle in AWS Marketplace - search for the owner ID 131827586825 to list the available Oracle Linux AMIs produced by Oracle. 
    const amiLinux = new ec2.GenericLinuxImage({ 
      'us-east-1' : 'ami-0982e92692864ea84'
    });

    //Create security group
    this.sg = new ec2.SecurityGroup(this, 'sap-sg', { vpc });
    this.sg.addIngressRule(ec2.Peer.ipv4('10.0.0.0/16'), ec2.Port.allTraffic());

    //Bucket to store script
    const s3bucket = new s3.Bucket(this, 'sap-oracle-bootstrap', {
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    const s3Asset = new s3deploy.BucketDeployment(this, 'sap-oracle-bucket', {
      sources: [s3deploy.Source.asset('./scripts') ],
      destinationBucket: s3bucket,
      retainOnDelete: false,
    });

    this.fileSystem = new efs.FileSystem(this, 'sap-oracle-efs', {
      vpc,
      vpcSubnets: {
        subnetGroupName: AppConfig.subnetName,
      },
      securityGroup: this.sg,
      encrypted: true, 
      lifecyclePolicy: efs.LifecyclePolicy.AFTER_14_DAYS, 
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE, 
    });

    this.ec2Instance = new ec2.Instance(this, 'sap-ec2', {
      vpc,
      vpcSubnets: {
        subnetGroupName: AppConfig.subnetName,
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.XLARGE2),
      machineImage: amiLinux,
      securityGroup: this.sg,
      keyName: AppConfig.sshKeyName,
      userDataCausesReplacement: true,
      blockDevices: [
        {
        //root devices 
        deviceName: '/dev/sda1',
        volume: BlockDeviceVolume.ebs(200, {
          deleteOnTermination: true,
          encrypted: true,
          volumeType: EbsDeviceVolumeType.GP2,
          }),
        },
        {
        //oracle mount point
          deviceName: '/dev/sdb',
          volume: BlockDeviceVolume.ebs(300, {
            deleteOnTermination: true,
            encrypted: true,
            volumeType: EbsDeviceVolumeType.GP2,
            }),
        }
      ],
      },
    );

    this.ec2Instance.addToRolePolicy(new PolicyStatement({
      actions: [
        'ssm:*',
        's3:*',
        'ssmmessages:*',
        'ssm:UpdateInstanceInformation',
        'ec2messages:*',
      ],
      resources: ['*'],
    }));

    this.scriptLocation = new cdk.CfnOutput(this, 'Script S3 location', { value: (s3bucket.bucketName )});     

    this.ec2Instance.addUserData(
      "yum install -y nfs-utils",
      "file_system_id_1=" + this.fileSystem.fileSystemId,
      "mkdir /sapmnt",
      "efs_mount_point_1=/sapmnt/",
      "test -f \"/sbin/mount.efs\" && echo \"${file_system_id_1}:/ ${efs_mount_point_1} efs defaults,_netdev\" >> /etc/fstab || " +
      "echo \"${file_system_id_1}.efs." + repoRegion + ".amazonaws.com:/ ${efs_mount_point_1} nfs4 nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport,_netdev 0 0\" >> /etc/fstab",
      "mount -a",
      'yum install -y unzip',
      'mkdir -p /root/install',
      'cd /root/install/',
      'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"',
      'unzip /root/install/awscliv2.zip',
      '/root/install/aws/install -i /usr/local/aws-cli -b /usr/local/bin',
      'yum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm',
      'systemctl enable amazon-ssm-agent',
      'systemctl start amazon-ssm-agent',
      "aws s3 cp s3://" + this.scriptLocation.value + "/bootstrap.sh /root/install/",
      "aws s3 cp s3://" + this.scriptLocation.value + "/inifile.params /root/install/",
      'chmod +x /root/install/bootstrap.sh',
      '/root/install/bootstrap.sh >> /root/install/bootstrap.log'
    );

  }
}
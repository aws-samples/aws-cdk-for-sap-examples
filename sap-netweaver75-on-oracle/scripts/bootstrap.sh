#!/bin/bash 
# SAP on Oracle Bootstraping

################ Functions ################ 
function install_packages() {
    echo "[INFO] Calling: yum install -y $@"
    yum install -y $@ > /dev/null
}

function set_hostname() {

    echo "[INFO] Setting hostname"
    PHOSTNAME=$saphostname
	MY_IP=$( ip a | grep inet | grep eth0 | awk -F"/" '{ print $1 }' | awk '{ print $2 }')
	echo "${MY_IP}"    "${PHOSTNAME}" >> /etc/hosts  
    hostname $PHOSTNAME
    echo $PHOSTNAME > /etc/hostname

}

function downloads_sap_software(){
    #Download SAP software 
    echo "[INFO] Download sap software"
    aws s3 sync $swbucket /sapmnt
}

function install_oracle_software(){
    echo "[INFO] Install oracle software"
    #(Optional) disable Firewalld
    systemctl stop firewalld
    
    # Oracle installation
    # Update user limit for Oracle limits recommended values
    cp /etc/security/limits.conf /etc/security/limits.conf_backup
    cat /etc/security/limits.conf | grep -v End > /etc/security/limits.conf_txt
    mv -f /etc/security/limits.conf_txt /etc/security/limits.conf
    echo '#input parameters from AWS CDK' >>/etc/security/limits.conf
    echo 'oracle   soft   nofile   1024' >>/etc/security/limits.conf
    echo 'oracle   hard   nofile   65536' >>/etc/security/limits.conf
    echo 'oracle   soft   nproc    16384' >>/etc/security/limits.conf
    echo 'oracle   hard   nproc    16384' >>/etc/security/limits.conf
    echo 'oracle   soft   stack    10240' >>/etc/security/limits.conf
    echo 'oracle   hard   stack    32768' >>/etc/security/limits.conf
    echo '# End of file' >>/etc/security/limits.conf
    echo QS_oracle_user_limits
    
    #Create Oracle User
    groupadd -g 54321 oinstall
    groupadd -g 54322 dba
    groupadd -g 54323 oper  
    useradd -s /bin/csh -u 54321 -g oinstall -G dba,oper oracle
    
    #Install Oracle Database
    chmod -R 777 /sapmnt/ORACLE_RDBMS
    chown -R oracle:oinstall /oracle
    runuser -l oracle -c "setenv DB_SID $oraclesid; /sapmnt/ORACLE_RDBMS/LINUX_X86_64/db_home/SAP/RUNINSTALLER -silent"

    /oracle/oraInventory/orainstRoot.sh
    /oracle/$oraclesid/19.0.0/root.sh

    #2551097 - Error 'tnsnamesOraTemplate must point to an existing file' with SWPM
    chmod -R 777 /sapmnt/sapinst/
}

function install_sap_software(){
    # SAP installation
    echo "[INFO] Start SAP installation"
    cd /sapmnt/sapinst/
    chmod +x /sapmnt/sapinst/SAPCAR
    /sapmnt/sapinst/SAPCAR -xvf /sapmnt/sapinst/SWPM*
    chmod +x /sapmnt/sapinst/sapinst
    /sapmnt/sapinst/sapinst SAPINST_INPUT_PARAMETERS_URL=/root/install/inifile.params SAPINST_EXECUTE_PRODUCT_ID=NW_ABAP_OneHost:NW750.ORA.ABAP SAPINST_SKIP_DIALOGS=true SAPINST_START_GUISERVER=false

}

function create_fs(){
    echo "[INFO] Setting Oracle filesystem"
    #Oracle mount point
    mkdir -p /oracle
    mkfs -t xfs /dev/nvme1n1
    fs_uuid=$(blkid -o value -s UUID /dev/nvme1n1)
    echo "UUID=${fs_uuid} /oracle   xfs    defaults 0 0" >> /etc/fstab
    # mount 
    mount -a

}

################ End of Functions ################ 

################ Start Script Logic ################
#Setting parameters
swbucket="<Amazon S3 bucket with SAP binaries>"
oraclesid="OR1"
saphostname="saporacle"

# Install Kernel packages needed to install Oracle and to have a Graphic interface needed for Oracle Java tools
YUM_PACKAGES=(
    csh
    xorg-x11-xauth.x86_64
    xorg-x11-server-utils.x86_64
    dbus-x11.x86_64
    binutils
    compat-libcap1
    gcc
    gcc-c++
    glibc
    glibc.i686
    glibc-devel
    glibc-devel.i686
    ksh
    libgcc
    libgcc.i686
    libstdc++
    libstdc++.i686
    libstdc++-devel
    libstdc++-devel.i686
    libaio
    libaio.i686
    libaio-devel
    libaio-devel.i686
    libXext
    libXext.i686
    libXtst
    libXtst.i686
    libX11
    libX11.i686
    libXau
    libXau.i686
    libxcb
    libxcb.i686
    libXi
    libXi.i686
    make
    sysstat
    unixODBC
    unixODBC-devel
    java
    compat-libstdc++-33
    zip
)

install_packages ${YUM_PACKAGES[@]}
set_hostname
create_fs
downloads_sap_software
install_oracle_software
install_sap_software

################ End of Script Logic ################
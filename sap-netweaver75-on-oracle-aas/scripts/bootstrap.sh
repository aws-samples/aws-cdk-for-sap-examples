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
	MY_IP=$( ip a | grep inet | grep global | awk -F"/" '{ print $1 }' | awk '{ print $2 }')
	echo "${MY_IP}"    "${PHOSTNAME}" >> /etc/hosts  
    hostname $PHOSTNAME
    echo $PHOSTNAME > /etc/hostname

}

function install_sap_software(){
    # SAP installation
    echo "[INFO] Start SAP installation"
    systemctl stop firewalld
    cd /sapmnt/sapinst/
    chmod +x /sapmnt/sapinst/SAPCAR
    /sapmnt/sapinst/SAPCAR -xvf /sapmnt/sapinst/SWPM*
    chmod +x /sapmnt/sapinst/sapinst
    /sapmnt/sapinst/sapinst SAPINST_INPUT_PARAMETERS_URL=/root/install/inifile.params SAPINST_EXECUTE_PRODUCT_ID=NW_DI:NW750.ORA.PD SAPINST_SKIP_DIALOGS=true SAPINST_START_GUISERVER=false

}

function create_fs(){
    echo "[INFO] Setting Oracle filesystem"
    #Oracle mount point
    mkdir -p /usr/sap
    mkfs -t xfs /dev/nvme1n1
    fs_uuid=$(blkid -o value -s UUID /dev/nvme1n1)
    echo "UUID=${fs_uuid} /oracle   xfs    defaults 0 0" >> /etc/fstab
    # mount 
    mount -a

}

################ End of Functions ################ 

################ Start Script Logic ################
#Setting parameters
oraclesid="OR1"
saphostname="sapaas"

# Install Kernel packages needed to install Oracle and to have a Graphic interface needed for Oracle Java tools
YUM_PACKAGES=(
    uuidd
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
install_sap_software

################ End of Script Logic ################
// wallet-connector.js
class WalletConnector {
  constructor(options = {}) {
    this.web3 = null;
    this.accounts = null;
    this.currentNetwork = null;
    this.options = {
      buttonId: 'connectWalletBtn',
      walletCardId: 'walletCard',
      connectedAddressId: 'connectedAddress',
      connectedNetworkId: 'connectedNetwork',
      walletBalanceId: 'walletBalance',
      disconnectBtnId: 'disconnectBtn',
      networkMap: {
        '1': '以太坊主网',
        '3': 'Ropsten测试网',
        '4': 'Rinkeby测试网',
        '5': 'Goerli测试网',
        '42': 'Kovan测试网'
      },
      ...options
    };
    
    // DOM元素引用
    this.elements = {
      connectBtn: null,
      walletCard: null,
      connectedAddress: null,
      connectedNetwork: null,
      walletBalance: null,
      disconnectBtn: null
    };
    
    // 初始化
    this.init();
  }
  
  // 初始化方法
  init() {
    // 获取DOM元素
    this.elements.connectBtn = document.getElementById(this.options.buttonId);
    this.elements.walletCard = document.getElementById(this.options.walletCardId);
    this.elements.connectedAddress = document.getElementById(this.options.connectedAddressId);
    this.elements.connectedNetwork = document.getElementById(this.options.connectedNetworkId);
    this.elements.walletBalance = document.getElementById(this.options.walletBalanceId);
    this.elements.disconnectBtn = document.getElementById(this.options.disconnectBtnId);
    
    // 添加事件监听
    if (this.elements.connectBtn) {
      this.elements.connectBtn.addEventListener('click', () => this.connectWallet());
    }
    
    if (this.elements.disconnectBtn) {
      this.elements.disconnectBtn.addEventListener('click', () => this.disconnectWallet());
    }
    
    // 检查钱包是否已连接
    this.checkWalletConnection();
  }
  
  // 检查MetaMask是否安装
  isMetaMaskInstalled() {
    return typeof window.ethereum !== 'undefined';
  }
  
  // 检查钱包连接状态
  async checkWalletConnection() {
    if (this.isMetaMaskInstalled() && window.ethereum.isConnected()) {
      try {
        // 获取账户信息但不请求权限
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          this.accounts = accounts;
          this.currentNetwork = await window.ethereum.request({ method: 'net_version' });
          this.web3 = new Web3(window.ethereum);
          
          // 更新UI
          this.updateWalletUI();
          await this.getWalletBalance();
          
          // 添加事件监听
          this.setupEventListeners();
        }
      } catch (error) {
        console.error('检查钱包连接失败:', error);
      }
    }
  }
  
  // 连接钱包
  async connectWallet() {
    try {
      if (!this.isMetaMaskInstalled()) {
        alert('请安装MetaMask插件以继续');
        window.open('https://metamask.io/', '_blank');
        return;
      }
      
      // 请求用户授权
      this.accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      this.currentNetwork = await window.ethereum.request({ method: 'net_version' });
      
      // 初始化Web3
      this.web3 = new Web3(window.ethereum);
      
      // 更新UI
      this.updateWalletUI();
      await this.getWalletBalance();
      
      // 添加事件监听
      this.setupEventListeners();
      
      console.log('MetaMask连接成功:', this.accounts[0]);
      
      // 触发连接成功回调
      if (this.options.onConnect) {
        this.options.onConnect(this.accounts[0], this.currentNetwork);
      }
    } catch (error) {
      console.error('连接MetaMask失败:', error);
      
      // 处理用户拒绝连接的情况
      if (error.code === 4001) {
        alert('您已拒绝连接请求');
      } else {
        alert('连接钱包时出错: ' + error.message);
      }
      
      // 触发连接失败回调
      if (this.options.onConnectError) {
        this.options.onConnectError(error);
      }
    }
  }
  
  // 断开钱包连接
  disconnectWallet() {
    // 移除事件监听
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', this.handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', this.handleChainChanged);
    }
    
    // 重置状态
    this.accounts = null;
    this.currentNetwork = null;
    this.web3 = null;
    
    // 更新UI
    this.updateWalletUI();
    
    console.log('钱包已断开连接');
    
    // 触发断开连接回调
    if (this.options.onDisconnect) {
      this.options.onDisconnect();
    }
  }
  
  // 获取钱包余额
  async getWalletBalance() {
    if (!this.web3 || !this.accounts || this.accounts.length === 0) return;
    
    try {
      const balance = await this.web3.eth.getBalance(this.accounts[0]);
      const ethBalance = this.web3.utils.fromWei(balance, 'ether');
      
      if (this.elements.walletBalance) {
        this.elements.walletBalance.textContent = `${parseFloat(ethBalance).toFixed(4)} ETH`;
      }
      
      // 触发余额更新回调
      if (this.options.onBalanceUpdate) {
        this.options.onBalanceUpdate(ethBalance);
      }
      
      return ethBalance;
    } catch (error) {
      console.error('获取余额失败:', error);
      
      if (this.elements.walletBalance) {
        this.elements.walletBalance.textContent = '无法获取余额';
      }
      
      // 触发余额更新失败回调
      if (this.options.onBalanceError) {
        this.options.onBalanceError(error);
      }
      
      return null;
    }
  }
  
  // 更新钱包UI
  updateWalletUI() {
    if (this.elements.connectBtn && this.elements.walletCard) {
      if (this.accounts && this.accounts.length > 0) {
        // 已连接
        if (this.elements.connectBtn) {
          this.elements.connectBtn.classList.add('bg-green-500', 'hover:bg-green-600');
          this.elements.connectBtn.classList.remove('bg-primary', 'hover:bg-primary/90');
        }
        
        // 显示截断的钱包地址
        if (this.elements.connectedAddress) {
          const address = this.accounts[0];
          this.elements.connectedAddress.textContent = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
        }
        
        // 显示网络名称
        if (this.elements.connectedNetwork) {
          this.elements.connectedNetwork.textContent = this.options.networkMap[this.currentNetwork] || `未知网络 (${this.currentNetwork})`;
        }
        
        // 显示钱包卡片
        if (this.elements.walletCard) {
          this.elements.walletCard.classList.remove('hidden');
        }
      } else {
        // 未连接
        if (this.elements.connectBtn) {
          this.elements.connectBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
          this.elements.connectBtn.classList.add('bg-primary', 'hover:bg-primary/90');
        }
        
        // 隐藏钱包卡片
        if (this.elements.walletCard) {
          this.elements.walletCard.classList.add('hidden');
        }
      }
    }
  }
  
  // 设置事件监听
  setupEventListeners() {
    // 监听账户变化
    if (window.ethereum) {
      // 绑定事件处理函数的上下文
      this.handleAccountsChanged = this.handleAccountsChanged.bind(this);
      this.handleChainChanged = this.handleChainChanged.bind(this);
      
      window.ethereum.on('accountsChanged', this.handleAccountsChanged);
      window.ethereum.on('chainChanged', this.handleChainChanged);
    }
  }
  
  // 处理账户变化
  handleAccountsChanged(newAccounts) {
    if (newAccounts.length === 0) {
      this.disconnectWallet();
    } else {
      this.accounts = newAccounts;
      this.updateWalletUI();
      this.getWalletBalance();
      
      // 触发账户变化回调
      if (this.options.onAccountChanged) {
        this.options.onAccountChanged(newAccounts[0]);
      }
    }
  }
  
  // 处理网络变化
  handleChainChanged(chainId) {
    this.currentNetwork = chainId;
    this.updateWalletUI();
    
    // 触发网络变化回调
    if (this.options.onNetworkChanged) {
      this.options.onNetworkChanged(chainId);
    }
  }
  
  // 获取当前连接的账户
  getConnectedAccount() {
    return this.accounts && this.accounts.length > 0 ? this.accounts[0] : null;
  }
  
  // 获取当前网络ID
  getCurrentNetwork() {
    return this.currentNetwork;
  }
  
  // 获取Web3实例
  getWeb3() {
    return this.web3;
  }
}

// 导出模块
export default WalletConnector;
// 引入WalletConnector类
import WalletConnector from './wallet-connector.js';

// 初始化钱包连接器
document.addEventListener('DOMContentLoaded', () => {
  const walletConnector = new WalletConnector({
    // 可以在这里自定义选项
    onConnect: (account, network) => {
      console.log('钱包连接成功:', account, network);
      // 在这里可以添加连接成功后的逻辑
    },
    onDisconnect: () => {
      console.log('钱包已断开连接');
      // 在这里可以添加断开连接后的逻辑
    },
    onAccountChanged: (newAccount) => {
      console.log('账户已切换:', newAccount);
      // 在这里可以添加账户切换后的逻辑
    },
    onNetworkChanged: (newNetwork) => {
      console.log('网络已切换:', newNetwork);
      // 在这里可以添加网络切换后的逻辑
    }
  });
  
  // 模态框相关事件
  const connectWalletBtn = document.getElementById('connectWalletBtn');
  const walletModal = document.getElementById('walletModal');
  const modalContent = document.getElementById('modalContent');
  const modalOverlay = document.getElementById('modalOverlay');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const metaMaskWalletBtn = document.getElementById('metaMaskWalletBtn');
  
  if (connectWalletBtn) {
    connectWalletBtn.addEventListener('click', () => {
      if (walletModal) walletModal.classList.remove('hidden');
      if (document.body) document.body.style.overflow = 'hidden'; // 防止背景滚动
      
      // 添加动画效果
      setTimeout(() => {
        if (modalContent) modalContent.classList.remove('scale-95', 'opacity-0');
        if (modalContent) modalContent.classList.add('scale-100', 'opacity-100');
      }, 10);
    });
  }
  
  function closeWalletModal() {
    if (modalContent) modalContent.classList.remove('scale-100', 'opacity-100');
    if (modalContent) modalContent.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
      if (walletModal) walletModal.classList.add('hidden');
      if (document.body) document.body.style.overflow = ''; // 恢复背景滚动
    }, 300);
  }
  
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeWalletModal);
  if (modalOverlay) modalOverlay.addEventListener('click', closeWalletModal);
  
  // 键盘事件：ESC关闭模态框
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && walletModal && !walletModal.classList.contains('hidden')) {
      closeWalletModal();
    }
  });
  
  // MetaMask按钮点击事件
  if (metaMaskWalletBtn) {
    metaMaskWalletBtn.addEventListener('click', () => {
      walletConnector.connectWallet();
      closeWalletModal();
    });
  }
});
// Tailwind 配置
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          primary: '#'#F59E0B, // 替换为您网站的主色调
          secondary: '##F59E0B', // 替换为您网站的辅助色
          dark: '#1A1B26',
          'dark-light': '#2A2C41',
          'text-light': '#C9CDDA',
          'grey-1': '#3A3C52'
        },
        fontFamily: {
          // 替换为您网站使用的字体
          inter: ['Inter', 'sans-serif'],
        },
      }
    }
  }
</script>

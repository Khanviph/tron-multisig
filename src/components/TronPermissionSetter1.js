import React, { useState, useEffect } from 'react';

const TronPermissionSetter = () => {
  const [tronWeb, setTronWeb] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [targetAddress, setTargetAddress] = useState("");
  const [controllers, setControllers] = useState([""]);
  const [threshold, setThreshold] = useState(1);

  useEffect(() => {
    const initTronWeb = async () => {
      if (window.tronWeb && window.tronWeb.ready) {
        try {
          // 设置Nile测试网节点
          const tronWeb = window.tronWeb;
          tronWeb.setFullNode('https://nile.trongrid.io');
          tronWeb.setSolidityNode('https://nile.trongrid.io');
          tronWeb.setEventServer('https://nile.trongrid.io');
          
          console.log("当前节点:", tronWeb.fullNode.host);
          setTronWeb(tronWeb);
          
          // 测试节点连接
          const nodeInfo = await tronWeb.trx.getNodeInfo();
          console.log("节点信息:", nodeInfo);
          
        } catch (err) {
          console.error("节点连接错误:", err);
          setError("请在TronLink中切换到Nile测试网");
        }
      } else {
        setError("请先安装并连接TronLink钱包");
      }
    };
    initTronWeb();
  }, []);

  // 添加控制地址
  const addController = () => {
    setControllers([...controllers, ""]);
  };

  // 移除控制地址
  const removeController = (index) => {
    const newControllers = controllers.filter((_, i) => i !== index);
    setControllers(newControllers);
    if (threshold > newControllers.length) {
      setThreshold(newControllers.length);
    }
  };

  // 更新控制地址
  const updateController = (index, value) => {
    const newControllers = [...controllers];
    newControllers[index] = value;
    setControllers(newControllers);
  };

  // 检查钱包连接
  const checkWallet = async () => {
    if (!window.tronWeb || !window.tronWeb.ready) {
      throw new Error("请先连接TronLink钱包");
    }
    
    // 确保在Nile测试网
    const network = window.tronWeb.fullNode.host;
    if (!network.includes('nile')) {
      throw new Error("请切换到Nile测试网");
    }
    
    return window.tronWeb;
  };

  // 设置多签权限
  const setMultiSignPermission = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      // 检查钱包
      const tronWeb = await checkWallet();

      if (!tronWeb) {
        throw new Error("TronWeb未初始化");
      }

      if (!tronWeb.isAddress(targetAddress)) {
        throw new Error("被控制地址格式不正确");
      }

      const validControllers = controllers.filter(addr => addr && tronWeb.isAddress(addr));
      if (validControllers.length < threshold) {
        throw new Error("有效控制地址数量少于所需签名数");
      }

      // 构建新的权限参数，包括owner和active权限
      const updateParams = {
        owner_address: tronWeb.address.toHex(targetAddress),
        owner: {  // 设置owner权限
          type: 0,
          permission_name: 'owner',
          threshold: threshold,
          keys: validControllers.map(address => ({
            address: tronWeb.address.toHex(address),
            weight: 1
          }))
        },
        actives: [{  // 设置active权限
          type: 2,
          permission_name: 'active',
          threshold: threshold,
          operations: "7fff1fc0033e0300000000000000000000000000000000000000000000000000",
          keys: validControllers.map(address => ({
            address: tronWeb.address.toHex(address),
            weight: 1
          }))
        }]
      };

      // 使用POST请求直接调用API
      const transaction = await tronWeb.fullNode.request(
        '/wallet/accountpermissionupdate',
        updateParams,
        'post'
      );

      // 设置交易过期时间
      const now = Date.now();
      const txID = transaction.txID;
      transaction.expiration = now + 60 * 1000; // 60秒过期时间
      transaction.timestamp = now;

      // 等待用户签名
      console.log("等待用户确认交易...");
      const signedTx = await window.tronWeb.trx.sign(transaction);
      
      // 广播交易
      console.log("广播交易...");
      const receipt = await window.tronWeb.trx.sendRawTransaction(signedTx);
      
      if (receipt.result) {
        setSuccess(`多签权限设置成功! 交易ID: ${txID}`);
        return;
      }
      throw new Error("交易被拒绝");

    } catch (err) {
      console.error("详细错误信息:", err);
      
      if (err.message.includes("Network Error")) {
        setError("网络连接错误，请检查您的网络连接或切换节点");
      } else if (err.message.includes("Contract validate error")) {
        setError("合约验证错误，请检查地址格式和权限设置");
      } else if (err.message.includes("balance is not sufficient")) {
        setError("账户余额不足，请确保有足够的TRX");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">设置TRON多签权限</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                被控制地址 (地址A)
              </label>
              <input
                type="text"
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                placeholder="输入需要设置多签的地址"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                控制地址列表 (地址B)
              </label>
              {controllers.map((controller, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={controller}
                    onChange={(e) => updateController(index, e.target.value)}
                    placeholder={`控制地址 ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  />
                  {controllers.length > 1 && (
                    <button
                      onClick={() => removeController(index)}
                      className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addController}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                添加控制地址
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                所需签名数
              </label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                min={1}
                max={controllers.length}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <button
              onClick={setMultiSignPermission}
              disabled={loading}
              className={`w-full px-4 py-2 text-white rounded-md ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {loading ? "设置中..." : "设置多签权限"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TronPermissionSetter;

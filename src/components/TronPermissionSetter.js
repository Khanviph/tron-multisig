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
      // 等待TronLink注入tronWeb对象
      let tries = 0;
      const maxTries = 10;
      
      const checkTronWeb = () => {
        if (window.tronWeb && window.tronWeb.ready) {
          setupTronWeb();
        } else if (tries < maxTries) {
          tries++;
          setTimeout(checkTronWeb, 1000);
        } else {
          setError("未检测到TronLink，请确保在TronLink中打开");
        }
      };

      checkTronWeb();
    };

    const setupTronWeb = async () => {
      try {
        const tronWeb = window.tronWeb;
        // 支持自动检测网络
        console.log("当前节点:", tronWeb.fullNode.host);
        setTronWeb(tronWeb);
        
        // 测试节点连接
        const nodeInfo = await tronWeb.trx.getNodeInfo();
        console.log("节点信息:", nodeInfo);
        
      } catch (err) {
        console.error("连接错误:", err);
        setError("网络连接失败，请检查网络设置");
      }
    };

    initTronWeb();
  }, []);

  // 添加控制地址
  const addController = () => {
    if (controllers.length < 5) { // 限制最大地址数量
      setControllers([...controllers, ""]);
    }
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

  // 设置多签权限
  const setMultiSignPermission = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      if (!window.tronWeb || !window.tronWeb.ready) {
        throw new Error("请确保在TronLink中打开此页面");
      }

      const tronWeb = window.tronWeb;

      if (!tronWeb.isAddress(targetAddress)) {
        throw new Error("被控制地址格式不正确");
      }

      const validControllers = controllers.filter(addr => addr && tronWeb.isAddress(addr));
      if (validControllers.length < threshold) {
        throw new Error("有效控制地址数量少于所需签名数");
      }

      // 构建权限参数
      const updateParams = {
        owner_address: tronWeb.address.toHex(targetAddress),
        owner: {
          type: 0,
          permission_name: 'owner',
          threshold: threshold,
          keys: validControllers.map(address => ({
            address: tronWeb.address.toHex(address),
            weight: 1
          }))
        },
        actives: [{
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

      // 使用POST请求调用API
      const transaction = await tronWeb.fullNode.request(
        '/wallet/accountpermissionupdate',
        updateParams,
        'post'
      );

      // 设置交易过期时间
      const now = Date.now();
      const txID = transaction.txID;
      transaction.expiration = now + 60 * 1000;
      transaction.timestamp = now;

      // 等待用户签名
      const signedTx = await tronWeb.trx.sign(transaction);
      
      // 广播交易
      const receipt = await tronWeb.trx.sendRawTransaction(signedTx);
      
      if (receipt.result) {
        setSuccess(`多签权限设置成功! 交易ID: ${txID}`);
        return;
      }
      throw new Error("交易被拒绝");

    } catch (err) {
      console.error("错误:", err);
      setError(err.message || "设置失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow">
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">设置TRON多签权限</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded mb-4 text-sm">
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                被控制地址
              </label>
              <input
                type="text"
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                placeholder="输入需要设置多签的地址"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                控制地址列表
              </label>
              {controllers.map((controller, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={controller}
                    onChange={(e) => updateController(index, e.target.value)}
                    placeholder={`控制地址 ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  {controllers.length > 1 && (
                    <button
                      onClick={() => removeController(index)}
                      className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
              {controllers.length < 5 && (
                <button
                  onClick={addController}
                  className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm"
                >
                  添加地址
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                所需签名数
              </label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Math.min(parseInt(e.target.value) || 1, controllers.length))}
                min={1}
                max={controllers.length}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>

            <button
              onClick={setMultiSignPermission}
              disabled={loading}
              className={`w-full px-4 py-2 text-white rounded text-sm ${
                loading 
                  ? 'bg-gray-400' 
                  : 'bg-green-500 active:bg-green-600'
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

from tronpy import Tron
from tronpy.keys import PrivateKey
from tronpy.providers import HTTPProvider

# 使用 Nile 测试网 API 节点
client = Tron(provider=HTTPProvider(endpoint_uri="https://api.nileex.io"))

def create_multisig_account(owner_address, owner_private_key, participants, required_signatures):
    """
    创建多签账户
    :param owner_address: 发起多签账户创建的地址（创建者）
    :param owner_private_key: 创建者的私钥
    :param participants: 参与多签的地址列表
    :param required_signatures: 多签所需的最小签名数量
    """
    try:
        # 构建多签账户的参与者列表
        permissions = {
            "type": 2,
            "permission_name": "active",
            "threshold": required_signatures,
            "keys": [{"address": p, "weight": 1} for p in participants]
        }

        # 构造账户权限修改交易
        transaction = client.trx.update_account_permissions(
            account=owner_address,
            owner_permission=None,  # 保持 owner 权限不变
            active_permission=permissions,  # 设置多签的 active 权限
        )

        # 使用私钥签名交易
        private_key = PrivateKey(owner_private_key)
        signed_tx = transaction.sign(private_key)

        # 广播交易
        tx_hash = client.broadcast(signed_tx)
        print(f"多签账户创建成功，交易哈希: {tx_hash}")
    except Exception as e:
        print(f"多签账户创建失败: {e}")


if __name__ == "__main__":
    # 输入创建者信息
    print("请输入多签账户创建者的信息：")
    owner_address = input("创建者地址: ").strip()
    owner_private_key = input("创建者私钥: ").strip()

    # 输入参与者信息
    print("请输入参与多签的地址（每输入一个地址按回车，完成后按两次回车结束）：")
    participants = []
    while True:
        participant = input().strip()
        if not participant:
            break
        participants.append(participant)

    if len(participants) == 0:
        print("未输入任何参与者地址，程序退出。")
        exit()

    # 输入多签规则
    required_signatures = int(input(f"请输入多签所需的最小签名数量 (1-{len(participants)}): ").strip())

    if required_signatures > len(participants) or required_signatures < 1:
        print("无效的最小签名数量，程序退出。")
        exit()

    # 创建多签账户
    create_multisig_account(owner_address, owner_private_key, participants, required_signatures)


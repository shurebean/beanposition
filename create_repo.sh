#!/bin/bash
# GitHub仓库创建脚本
# 使用方法：./create_repo.sh <repo-name> <description>

REPO_NAME="${1:-beanposition}"
DESCRIPTION="${2:-小豆子旅行轨迹 - 微信小程序}"

echo "准备创建GitHub仓库：$REPO_NAME"
echo "注意：这需要你的GitHub个人访问令牌"
echo ""
echo "请访问：https://github.com/settings/tokens"
echo "1. 点击 'Generate new token'"
echo "2. 勾选 'repo' 权限（完整仓库访问）"
echo "3. 生成后复制Token"
echo "4. 运行：bash create_repo.sh $REPO_NAME '$DESCRIPTION' YOUR_TOKEN"
echo ""

# 如果提供了Token，则尝试创建
if [ -n "$3" ]; then
  echo "使用提供的Token创建仓库..."
  RESPONSE=$(curl -s -X POST \
    -H "Authorization: token $3" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/user/repos" \
    -d "{\"name\":\"$REPO_NAME\",\"description\":\"$DESCRIPTION\",\"private\":true,\"auto_init\":false}")
  
  echo "$RESPONSE"
  
  if echo "$RESPONSE" | grep -q '"name"'; then
    echo ""
    echo "✅ 仓库创建成功！"
    echo "现在可以推送代码了。"
  else
    echo ""
    echo "❌ 仓库创建失败"
    echo "请检查Token是否有效"
  fi
fi

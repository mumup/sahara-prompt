import OpenAI from 'openai';
import ollama from 'ollama/browser';

let apiInstance = null;
let apiConfig = {
  type: 'openai', // 'openai' 或 'ollama'
  baseURL: 'https://api.together.xyz/v1', // 默认OpenAI API地址
  ollamaURL: 'http://localhost:11434/api' // 默认Ollama API地址
};

/**
 * 设置API配置
 * @param {Object} config - API配置
 * @param {string} config.type - API类型 ('openai' 或 'ollama')
 * @param {string} config.baseURL - OpenAI API基础URL
 * @param {string} config.ollamaURL - Ollama API基础URL
 */
export const setApiConfig = (config) => {
  if (config.type) apiConfig.type = config.type;
  if (config.baseURL) apiConfig.baseURL = config.baseURL;
  if (config.ollamaURL) apiConfig.ollamaURL = config.ollamaURL;
  return apiConfig;
};

/**
 * 获取当前API配置
 * @returns {Object} - 当前API配置
 */
export const getApiConfig = () => {
  return { ...apiConfig };
};

/**
 * 初始化API客户端
 * @param {string} apiKey - API密钥 (OpenAI需要，Ollama不需要)
 */
export const initOpenAI = (apiKey) => {
  if (apiConfig.type === 'openai') {
    apiInstance = new OpenAI({
      baseURL: apiConfig.baseURL,
      apiKey,
      dangerouslyAllowBrowser: true // 允许在浏览器中使用API密钥（注意：在生产环境中应使用后端代理）
    });
  } else {
    // Ollama不需要初始化客户端，只需要记录配置
    apiInstance = { type: 'ollama' };
  }
  return apiInstance;
};

/**
 * 获取可用模型列表
 * @returns {Promise<Array>} - 模型列表，包含value和label属性
 */
export const getModelsList = async () => {
  if (!apiInstance) {
    throw new Error('API客户端未初始化，请先设置API密钥');
  }

  try {
    if (apiConfig.type === 'openai') {
      // 从OpenAI获取模型列表
      const response = await apiInstance.models.list();

      const curr = response.data.length > 0 ? response.data : response.body

      return curr
        .filter(model => /qwen|llama/i.test(model.id))
        .map(model => ({
          value: model.id,
          label: model.id
        }));
    } else {
      // 从Ollama获取模型列表
      const response = await ollama.list();

      return response.models.map(model => ({
        value: model.name,
        label: model.name
      }));
    }
  } catch (error) {
    console.error(`获取模型列表失败:`, error);
    // 返回默认模型列表作为备选
    return [];
  }
};

/**
 * 测试越狱提示词
 * @param {string} userQuestion - 用户问题
 * @param {string} jailbreakPrompt - 越狱提示词
 * @param {string} model - 使用的模型
 * @param {number} temperature - 温度参数，控制输出的随机性 (默认: 0.7)
 * @param {boolean} stream - 是否使用流式响应 (默认: false)
 * @param {function} onStreamData - 流式响应数据回调函数 (stream为true时必须提供)
 * @returns {Promise<string>} - 模型响应
 */
export const testJailbreakPrompt = async (userQuestion, jailbreakPrompt, model, temperature = 0.7, stream = false, onStreamData = null) => {
  if (!apiInstance) {
    throw new Error('API客户端未初始化，请先设置API密钥');
  }

  try {
    if (apiConfig.type === 'openai') {
      // 使用OpenAI API
      if (stream) {
        // 流式响应处理
        if (!onStreamData || typeof onStreamData !== 'function') {
          throw new Error('使用流式响应时必须提供onStreamData回调函数');
        }
        
        let fullContent = '';
        const response = await apiInstance.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: jailbreakPrompt },
            { role: 'user', content: userQuestion }
          ],
          // temperature,
          stream: true
        });
        
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullContent += content;
            onStreamData(content, fullContent);
          }
        }
        
        return fullContent;
      } else {
        // 非流式响应处理
        const response = await apiInstance.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: jailbreakPrompt },
            { role: 'user', content: userQuestion }
          ],
          // temperature,
        });

        return response.choices[0].message.content;
      }
    } else {
      // 使用Ollama API通过ollama/browser库
      if (stream) {
        // 流式响应处理
        if (!onStreamData || typeof onStreamData !== 'function') {
          throw new Error('使用流式响应时必须提供onStreamData回调函数');
        }
        
        let fullContent = '';
        const response = await ollama.chat({
          model,
          messages: [
            { role: 'system', content: jailbreakPrompt },
            { role: 'user', content: userQuestion }
          ],
          options: {
            // temperature
          },
          stream: true
        });
        
        for await (const chunk of response) {
          const content = chunk.message?.content || '';
          if (content) {
            // Ollama的流式响应可能会返回完整内容而不是增量内容，需要处理
            const newContent = content.substring(fullContent.length);
            fullContent = content;
            onStreamData(newContent, fullContent);
          }
        }
        
        return fullContent;
      } else {
        // 非流式响应处理
        const response = await ollama.chat({
          model,
          messages: [
            { role: 'system', content: jailbreakPrompt },
            { role: 'user', content: userQuestion }
          ],
          options: {
            // temperature
          }
        });

        return response.message.content;
      }
    }
  } catch (error) {
    console.error(`${apiConfig.type === 'openai' ? 'OpenAI' : 'Ollama'} API调用失败:`, error);
    throw error;
  }
};
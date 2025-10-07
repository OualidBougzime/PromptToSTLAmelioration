// test-ollama.mjs
import axios from 'axios'

async function testOllama() {
    console.log('🧪 Testing Ollama connectivity from Node.js...\n')

    const urls = [
        'http://localhost:11434',
        'http://127.0.0.1:11434'
    ]

    for (const baseUrl of urls) {
        console.log(`\n📡 Testing: ${baseUrl}`)

        // Test 1: Tags endpoint
        try {
            const tagsUrl = `${baseUrl}/api/tags`
            console.log(`  Trying: ${tagsUrl}`)
            const tagsResponse = await axios.get(tagsUrl, { timeout: 5000 })
            console.log(`  ✅ Tags endpoint works!`)
            console.log(`  Status: ${tagsResponse.status}`)
            console.log(`  Models found: ${tagsResponse.data.models?.length || 0}`)
            if (tagsResponse.data.models?.length > 0) {
                console.log(`  First model: ${tagsResponse.data.models[0].name}`)
            }
        } catch (error) {
            console.log(`  ❌ Tags endpoint failed: ${error.message}`)
            if (error.code) console.log(`     Error code: ${error.code}`)
        }

        // Test 2: Generate endpoint
        try {
            const genUrl = `${baseUrl}/api/generate`
            console.log(`\n  Trying: ${genUrl}`)
            console.log(`  Sending test request...`)

            const genResponse = await axios.post(
                genUrl,
                {
                    model: 'qwen2.5-coder:32b',
                    prompt: 'Say hello',
                    stream: false
                },
                { timeout: 30000 }
            )

            console.log(`  ✅ Generate endpoint works!`)
            console.log(`  Status: ${genResponse.status}`)
            console.log(`  Response length: ${genResponse.data.response?.length || 0} chars`)
            console.log(`  Response preview: ${genResponse.data.response?.substring(0, 100)}...`)

        } catch (error) {
            console.log(`  ❌ Generate endpoint failed: ${error.message}`)
            if (error.response) {
                console.log(`     HTTP Status: ${error.response.status}`)
                console.log(`     Response data: ${JSON.stringify(error.response.data)}`)
            }
            if (error.code) {
                console.log(`     Error code: ${error.code}`)
            }
        }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Test completed!')
    console.log('='.repeat(60))
}

testOllama().catch(err => {
    console.error('\n❌ Fatal error:', err)
    process.exit(1)
})
// @ts-check
/// <reference types="./types" />

{
  const html = String.raw

  const app = Vue.createApp({
    setup() {
      const modules = Vue.reactive([
        {
          _id: 'file',
          url: 'file.html',
          title: 'File',
          inputs: [],
          output: [],
          height: 64,
          inputConfiguration: {},
        },
        {
          _id: 'cache',
          url: 'cache.html',
          title: 'Cache',
          inputs: [],
          output: [],
          height: 64,
          inputConfiguration: {},
        },
      ])
      const outputBlobs = Vue.reactive({})
      return {
        modules,
        outputBlobs,
      }
    },
    template: html`<div class="px-4">
      <div class="my-4" v-for="module of modules">
        <module-item
          :modules="modules"
          :module="module"
          :outputBlobs="outputBlobs"
        ></module-item>
      </div>
    </div>`,
  })

  app.component('module-item', {
    props: ['module', 'modules', 'outputBlobs'],
    setup(props) {
      const iframe = Vue.ref(/** @type {HTMLIFrameElement | null} */ (null))
      const savedResult = Vue.shallowRef({})

      const onMessage = (e) => {
        const { module, outputBlobs } = props
        if (e.source === iframe.value.contentWindow) {
          const data = e.data
          if (data.register) {
            ;({
              title: module.title = module.title,
              inputs: module.inputs = [],
              outputs: module.outputs = [],
            } = data.register)
            savedResult.value = {}
          } else if (data.output) {
            for (const [k, v] of Object.entries(data.output)) {
              outputBlobs[module._id + ':' + k] = v
            }
          }
        }
      }

      const inputFeed = Vue.computed(() => {
        const result = {}
        for (const input of props.module.inputs) {
          const config = props.module.inputConfiguration[input]
          result[input] = props.outputBlobs[config] || null
        }
        console.log(result)
        return result
      })

      Vue.watch([inputFeed, savedResult], ([inputFeed, savedResult]) => {
        let toPost
        for (const [k, v] of Object.entries(inputFeed)) {
          if (savedResult[k] !== v) {
            if (!toPost) toPost = {}
            toPost[k] = v
            savedResult[k] = v
          }
        }
        if (toPost) {
          console.log(toPost)
          iframe.value.contentWindow.postMessage({ input: toPost }, '*')
        }
      })

      Vue.onMounted(() => {
        window.addEventListener('message', onMessage)
      })

      Vue.onUnmounted(() => {
        window.removeEventListener('message', onMessage)
      })

      return { iframe }
    },
    template: html`<section
      class="border border-gray-300 overflow-hidden rounded"
    >
      <div class="bg-gray-200 px-2 flex items-center">
        <h2 class="font-bold py-1 flex-1">{{module.title}}</h2>
        <div class="ml-3" v-for="input of module.inputs" :key="input">
          <span class="text-gray-600 mr-1">{{input}}</span>
          <input-widget
            :modules="modules"
            :module="module"
            :inputName="input"
          ></input-widget>
        </div>
        <div class="ml-3 text-gray-600 mr-1 flex-none">
          &rarr;
        </div>
        <div class="ml-3" v-for="output of module.outputs" :key="output">
          <span class="text-gray-600 mr-1">{{output}}</span>
          <output-widget
            :moduleId="module._id"
            :outputName="output"
            :outputBlobs="outputBlobs"
          ></output-widget>
        </div>
      </div>
      <iframe class="w-full" :src="module.url" ref="iframe"></iframe>
    </section>`,
  })

  app.component('input-widget', {
    props: ['module', 'modules', 'inputName'],
    setup(props) {
      return {
        options: Vue.computed(() => {
          return props.modules
            .filter((m) => m !== props.module)
            .flatMap((m) =>
              m.outputs.map((o) => ({
                value: m._id + ':' + o,
                text: m.title + ' - ' + o,
              })),
            )
        }),
        value: Vue.computed({
          get: () => {
            return props.module.inputConfiguration[props.inputName] || ''
          },
          set: (x) => {
            props.module.inputConfiguration[props.inputName] = x
          },
        }),
      }
    },
    template: html`<select
      class="inline-block bg-white border border-dashed border-gray-400 px-1"
      v-model="value"
    >
      <option value="">---</option>
      <option v-for="option of options" :value="option.value"
        >{{option.text}}</option
      >
    </select>`,
  })

  app.component('output-widget', {
    props: ['moduleId', 'outputName', 'outputBlobs'],
    setup(props) {
      return {
        blob: Vue.computed(() => {
          const blob =
            props.outputBlobs[props.moduleId + ':' + props.outputName]
          return blob
        }),
      }
    },
    template: html`<span
      class="inline-block bg-white border border-dashed border-gray-400 px-1"
    >
      <span v-if="blob">{{blob.name}}</span>
      <span v-else>(none)</span>
    </span>`,
  })

  app.mount('#app')
}
